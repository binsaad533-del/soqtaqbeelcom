
-- 1) Reply Templates table
CREATE TABLE public.reply_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.reply_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view reply templates"
  ON public.reply_templates FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'platform_owner') OR public.has_role(auth.uid(), 'supervisor'));

CREATE POLICY "Staff can insert reply templates"
  ON public.reply_templates FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'platform_owner') OR public.has_role(auth.uid(), 'supervisor'));

CREATE POLICY "Staff can update reply templates"
  ON public.reply_templates FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'platform_owner') OR public.has_role(auth.uid(), 'supervisor'));

CREATE POLICY "Staff can delete reply templates"
  ON public.reply_templates FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'platform_owner') OR public.has_role(auth.uid(), 'supervisor'));

-- 2) User Notes table
CREATE TABLE public.user_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  note text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_notes_user_id ON public.user_notes(user_id);

ALTER TABLE public.user_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view user notes"
  ON public.user_notes FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'platform_owner') OR public.has_role(auth.uid(), 'supervisor'));

CREATE POLICY "Staff can insert user notes"
  ON public.user_notes FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'platform_owner') OR public.has_role(auth.uid(), 'supervisor'));
