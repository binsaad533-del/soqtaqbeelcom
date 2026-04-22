
-- ============================================
-- PART A: Storage bucket + policies
-- ============================================

-- Create private bucket for protected listing documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'listing-documents',
  'listing-documents',
  false,
  10485760,
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

-- Owner-scoped policies on storage.objects for the new bucket only
-- Path convention: <owner_user_id>/<listing_id>/<filename>
DROP POLICY IF EXISTS "listing_documents_owner_select" ON storage.objects;
CREATE POLICY "listing_documents_owner_select"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'listing-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "listing_documents_owner_insert" ON storage.objects;
CREATE POLICY "listing_documents_owner_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'listing-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "listing_documents_owner_update" ON storage.objects;
CREATE POLICY "listing_documents_owner_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'listing-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

DROP POLICY IF EXISTS "listing_documents_owner_delete" ON storage.objects;
CREATE POLICY "listing_documents_owner_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'listing-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ============================================
-- PART B: Schema — document_access_requests
-- ============================================

CREATE TABLE IF NOT EXISTS public.document_access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  deal_id uuid NULL REFERENCES public.deals(id) ON DELETE SET NULL,
  requester_id uuid NOT NULL,
  owner_id uuid NOT NULL,

  scope text NOT NULL DEFAULT 'all_protected'
    CHECK (scope IN ('all_protected', 'specific')),
  document_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  categories text[] NOT NULL DEFAULT '{}',

  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'revoked', 'expired')),
  request_message text,
  rejection_reason text,

  access_expires_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  decided_by uuid,

  CONSTRAINT document_access_requests_unique_pair UNIQUE (listing_id, requester_id)
);

CREATE INDEX IF NOT EXISTS idx_dar_listing_status
  ON public.document_access_requests (listing_id, status);
CREATE INDEX IF NOT EXISTS idx_dar_requester
  ON public.document_access_requests (requester_id);
CREATE INDEX IF NOT EXISTS idx_dar_owner_status
  ON public.document_access_requests (owner_id, status);

ALTER TABLE public.document_access_requests ENABLE ROW LEVEL SECURITY;

-- Requester: read own requests
DROP POLICY IF EXISTS "dar_requester_select" ON public.document_access_requests;
CREATE POLICY "dar_requester_select"
ON public.document_access_requests FOR SELECT
TO authenticated
USING (auth.uid() = requester_id);

-- Requester: create own request
DROP POLICY IF EXISTS "dar_requester_insert" ON public.document_access_requests;
CREATE POLICY "dar_requester_insert"
ON public.document_access_requests FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = requester_id);

-- Owner: read all requests for listings they own
DROP POLICY IF EXISTS "dar_owner_select" ON public.document_access_requests;
CREATE POLICY "dar_owner_select"
ON public.document_access_requests FOR SELECT
TO authenticated
USING (auth.uid() = owner_id);

-- Owner: approve/reject/revoke
DROP POLICY IF EXISTS "dar_owner_update" ON public.document_access_requests;
CREATE POLICY "dar_owner_update"
ON public.document_access_requests FOR UPDATE
TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

-- Auto-update updated_at
DROP TRIGGER IF EXISTS trg_dar_updated_at ON public.document_access_requests;
CREATE TRIGGER trg_dar_updated_at
BEFORE UPDATE ON public.document_access_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- file_classifications: is_protected flag + auto-mark trigger
-- ============================================

ALTER TABLE public.file_classifications
  ADD COLUMN IF NOT EXISTS is_protected boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.auto_mark_protected_documents()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.final_category IN ('legal_document', 'invoice_document') THEN
    NEW.is_protected := true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_protected_on_classification ON public.file_classifications;
CREATE TRIGGER set_protected_on_classification
BEFORE INSERT OR UPDATE OF final_category ON public.file_classifications
FOR EACH ROW
EXECUTE FUNCTION public.auto_mark_protected_documents();

-- Backfill existing rows
UPDATE public.file_classifications
SET is_protected = true
WHERE final_category IN ('legal_document', 'invoice_document')
  AND is_protected = false;

-- ============================================
-- Auto-approve trusted buyers (BEFORE INSERT)
-- ============================================

CREATE OR REPLACE FUNCTION public.auto_approve_trusted_buyers()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If this requester has a previous APPROVED request from same owner → auto-approve
  IF NEW.status = 'pending' AND EXISTS (
    SELECT 1 FROM public.document_access_requests
    WHERE requester_id = NEW.requester_id
      AND owner_id = NEW.owner_id
      AND status = 'approved'
      AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) THEN
    NEW.status := 'approved';
    NEW.decided_at := now();
    NEW.decided_by := NEW.owner_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_approve_on_insert ON public.document_access_requests;
CREATE TRIGGER auto_approve_on_insert
BEFORE INSERT ON public.document_access_requests
FOR EACH ROW
EXECUTE FUNCTION public.auto_approve_trusted_buyers();

-- ============================================
-- Compute access_expires_at on approval (BEFORE INSERT/UPDATE)
-- - If linked to a deal: expires when deal completed_at OR cancelled
-- - If no deal_id: NULL (open until manually revoked)
-- ============================================

CREATE OR REPLACE FUNCTION public.compute_access_expiry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _completed_at timestamptz;
  _deal_status text;
BEGIN
  IF NEW.status = 'approved' THEN
    IF NEW.deal_id IS NOT NULL THEN
      SELECT completed_at, status INTO _completed_at, _deal_status
      FROM public.deals WHERE id = NEW.deal_id LIMIT 1;

      IF _deal_status IN ('cancelled', 'rejected') THEN
        NEW.access_expires_at := COALESCE(NEW.access_expires_at, now());
      ELSIF _completed_at IS NOT NULL THEN
        NEW.access_expires_at := _completed_at;
      ELSE
        NEW.access_expires_at := NULL; -- still active deal
      END IF;
    ELSE
      NEW.access_expires_at := NULL; -- open access until owner revokes
    END IF;

    IF NEW.decided_at IS NULL THEN
      NEW.decided_at := now();
    END IF;
  ELSIF NEW.status = 'revoked' OR NEW.status = 'expired' OR NEW.status = 'rejected' THEN
    IF NEW.decided_at IS NULL THEN
      NEW.decided_at := now();
    END IF;
    IF NEW.status IN ('revoked', 'expired') THEN
      NEW.access_expires_at := COALESCE(NEW.access_expires_at, now());
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_compute_access_expiry ON public.document_access_requests;
CREATE TRIGGER trg_compute_access_expiry
BEFORE INSERT OR UPDATE OF status ON public.document_access_requests
FOR EACH ROW
EXECUTE FUNCTION public.compute_access_expiry();

-- ============================================
-- Audit logging
-- ============================================

CREATE OR REPLACE FUNCTION public.log_document_access_decision()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.audit_logs (user_id, action, resource_type, resource_id, details)
    VALUES (
      NEW.requester_id,
      'document_access_requested',
      'document_access_request',
      NEW.id::text,
      jsonb_build_object('listing_id', NEW.listing_id, 'deal_id', NEW.deal_id, 'auto_status', NEW.status)
    );
  ELSIF (TG_OP = 'UPDATE') AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.audit_logs (user_id, action, resource_type, resource_id, details)
    VALUES (
      COALESCE(NEW.decided_by, auth.uid()),
      'document_access_' || NEW.status,
      'document_access_request',
      NEW.id::text,
      jsonb_build_object('listing_id', NEW.listing_id, 'old_status', OLD.status, 'new_status', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_dar_decision ON public.document_access_requests;
CREATE TRIGGER trg_log_dar_decision
AFTER INSERT OR UPDATE OF status ON public.document_access_requests
FOR EACH ROW
EXECUTE FUNCTION public.log_document_access_decision();
