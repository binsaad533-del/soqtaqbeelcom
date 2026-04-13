
-- Enums
CREATE TYPE public.ticket_category AS ENUM ('general', 'technical', 'billing', 'complaint', 'suggestion', 'other');
CREATE TYPE public.ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE public.ticket_status AS ENUM ('open', 'in_progress', 'waiting_response', 'resolved', 'closed');

-- Support tickets table
CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subject text NOT NULL,
  category ticket_category NOT NULL DEFAULT 'general',
  priority ticket_priority NOT NULL DEFAULT 'medium',
  status ticket_status NOT NULL DEFAULT 'open',
  assigned_to uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT subject_length CHECK (char_length(subject) <= 200)
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_support_tickets_user ON public.support_tickets (user_id);
CREATE INDEX idx_support_tickets_status ON public.support_tickets (status);
CREATE INDEX idx_support_tickets_assigned ON public.support_tickets (assigned_to);

-- RLS: user sees own tickets
CREATE POLICY "Users see own tickets"
  ON public.support_tickets FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR public.has_role(auth.uid(), 'platform_owner')
    OR public.has_role(auth.uid(), 'supervisor')
  );

CREATE POLICY "Users create own tickets"
  ON public.support_tickets FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Staff update tickets"
  ON public.support_tickets FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR public.has_role(auth.uid(), 'platform_owner')
    OR public.has_role(auth.uid(), 'supervisor')
  );

-- Ticket messages table
CREATE TABLE public.ticket_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  message text NOT NULL,
  is_staff boolean NOT NULL DEFAULT false,
  attachments text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT message_length CHECK (char_length(message) <= 5000)
);

ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_ticket_messages_ticket ON public.ticket_messages (ticket_id);

-- RLS: ticket parties + staff can read/write messages
CREATE POLICY "Ticket parties read messages"
  ON public.ticket_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND t.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'platform_owner')
    OR public.has_role(auth.uid(), 'supervisor')
  );

CREATE POLICY "Ticket parties write messages"
  ON public.ticket_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND (
      EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND t.user_id = auth.uid())
      OR public.has_role(auth.uid(), 'platform_owner')
      OR public.has_role(auth.uid(), 'supervisor')
    )
  );

-- Auto-update updated_at on tickets
CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Notify staff on new ticket
CREATE OR REPLACE FUNCTION public.fn_notify_new_ticket()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  _user_name text;
  _staff record;
BEGIN
  SELECT full_name INTO _user_name FROM profiles WHERE user_id = NEW.user_id LIMIT 1;

  FOR _staff IN
    SELECT user_id FROM user_roles WHERE role IN ('platform_owner', 'supervisor')
  LOOP
    INSERT INTO notifications (user_id, title, body, type, reference_type, reference_id)
    VALUES (
      _staff.user_id,
      'تذكرة دعم جديدة',
      COALESCE(_user_name, 'مستخدم') || ': ' || LEFT(NEW.subject, 80),
      'support',
      'ticket',
      NEW.id::text
    );
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_new_ticket
  AFTER INSERT ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_notify_new_ticket();

-- Notify on new message
CREATE OR REPLACE FUNCTION public.fn_notify_ticket_message()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  _ticket record;
  _sender_name text;
  _notify_id uuid;
BEGIN
  SELECT * INTO _ticket FROM support_tickets WHERE id = NEW.ticket_id LIMIT 1;
  SELECT full_name INTO _sender_name FROM profiles WHERE user_id = NEW.sender_id LIMIT 1;

  IF NEW.is_staff THEN
    -- Notify the ticket owner
    _notify_id := _ticket.user_id;
  ELSE
    -- Notify assigned staff or all staff
    _notify_id := _ticket.assigned_to;
    IF _notify_id IS NULL THEN
      INSERT INTO notifications (user_id, title, body, type, reference_type, reference_id)
      SELECT ur.user_id, 'رد جديد على تذكرة',
        COALESCE(_sender_name, 'مستخدم') || ': ' || LEFT(NEW.message, 80),
        'support', 'ticket', NEW.ticket_id::text
      FROM user_roles ur WHERE ur.role IN ('platform_owner', 'supervisor');
      RETURN NEW;
    END IF;
  END IF;

  IF _notify_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, title, body, type, reference_type, reference_id)
    VALUES (
      _notify_id,
      'رد جديد على تذكرة',
      COALESCE(_sender_name, 'مستخدم') || ': ' || LEFT(NEW.message, 80),
      'support', 'ticket', NEW.ticket_id::text
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_ticket_message
  AFTER INSERT ON public.ticket_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_notify_ticket_message();

-- Enable realtime for ticket messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_messages;
