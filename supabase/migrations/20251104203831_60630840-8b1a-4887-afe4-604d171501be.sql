-- Add QR and scan-related columns to tickets
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS qr_token text NOT NULL DEFAULT encode(gen_random_bytes(32), 'base64');
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS qr_hash text UNIQUE;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'valid' CHECK (status IN ('valid','used','revoked','expired'));

CREATE INDEX IF NOT EXISTS idx_tickets_qr_hash ON public.tickets(qr_hash);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets(status);

-- Create scan_devices table
CREATE TABLE IF NOT EXISTS public.scan_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id uuid NOT NULL REFERENCES public.organizers(id) ON DELETE CASCADE,
  name text NOT NULL,
  device_key text NOT NULL UNIQUE,
  last_seen timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create scan_sessions table
CREATE TABLE IF NOT EXISTS public.scan_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id uuid NOT NULL REFERENCES public.organizers(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  device_id uuid NOT NULL REFERENCES public.scan_devices(id) ON DELETE CASCADE,
  created_by uuid NOT NULL,
  started_at timestamptz DEFAULT now(),
  ends_at timestamptz,
  is_active boolean DEFAULT true
);

-- Create scan_logs table
CREATE TABLE IF NOT EXISTS public.scan_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  ticket_id uuid,
  device_id uuid,
  session_id uuid,
  scanned_at timestamptz DEFAULT now(),
  result text NOT NULL CHECK (result IN ('OK','ALREADY_USED','NOT_FOUND','WRONG_EVENT','REVOKED','EXPIRED','ERROR')),
  details jsonb
);

-- Enable RLS on new tables
ALTER TABLE public.scan_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for scan_devices
CREATE POLICY "Organizers can manage their own devices"
ON public.scan_devices FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.organizers o
    WHERE o.id = scan_devices.organizer_id AND o.owner_user_id = auth.uid()
  )
);

-- RLS policies for scan_sessions
CREATE POLICY "Organizers can manage their own sessions"
ON public.scan_sessions FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.organizers o
    WHERE o.id = scan_sessions.organizer_id AND o.owner_user_id = auth.uid()
  )
);

-- RLS policies for scan_logs
CREATE POLICY "Organizers can view logs for their events"
ON public.scan_logs FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.events e
    JOIN public.organizers o ON o.id = e.organizer_id
    WHERE e.id = scan_logs.event_id AND o.owner_user_id = auth.uid()
  )
);

CREATE POLICY "Active sessions can insert logs"
ON public.scan_logs FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.scan_sessions s
    JOIN public.organizers o ON o.id = s.organizer_id
    WHERE s.event_id = scan_logs.event_id 
    AND s.is_active = true
    AND o.owner_user_id = auth.uid()
  )
);

-- Add last_survey_at to client_profiles for monthly onboarding reminder
ALTER TABLE public.client_profiles ADD COLUMN IF NOT EXISTS last_survey_at timestamptz;

-- Update RLS policies to require email confirmation for critical operations
DROP POLICY IF EXISTS "Confirmed organizers can create events" ON public.events;
CREATE POLICY "Confirmed organizers can create events"
ON public.events FOR INSERT
TO authenticated
WITH CHECK (
  is_email_confirmed(auth.uid()) AND
  EXISTS (
    SELECT 1 FROM public.organizers o
    WHERE o.id = events.organizer_id AND o.owner_user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Confirmed users can create orders" ON public.orders;
CREATE POLICY "Confirmed users can create orders"
ON public.orders FOR INSERT
TO authenticated
WITH CHECK (
  is_email_confirmed(auth.uid()) AND auth.uid() = user_id
);

-- Create validate_ticket RPC function
CREATE OR REPLACE FUNCTION public.validate_ticket(p_qr_token text, p_event_id uuid, p_device_key text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_device_id uuid;
  v_organizer_id uuid;
  v_ticket record;
  v_qr_hash text;
BEGIN
  -- Authenticate device
  SELECT id, organizer_id INTO v_device_id, v_organizer_id
  FROM scan_devices
  WHERE device_key = p_device_key;
  
  IF v_device_id IS NULL THEN
    RETURN jsonb_build_object('result', 'ERROR', 'message', 'Invalid device');
  END IF;
  
  -- Check active session
  IF NOT EXISTS (
    SELECT 1 FROM scan_sessions
    WHERE device_id = v_device_id
    AND event_id = p_event_id
    AND is_active = true
  ) THEN
    RETURN jsonb_build_object('result', 'ERROR', 'message', 'No active session');
  END IF;
  
  -- Compute hash and find ticket
  v_qr_hash := encode(digest(p_qr_token, 'sha256'), 'hex');
  
  SELECT * INTO v_ticket
  FROM tickets
  WHERE qr_hash = v_qr_hash
  FOR UPDATE;
  
  IF NOT FOUND THEN
    -- Log failed attempt
    INSERT INTO scan_logs (event_id, device_id, result, details)
    VALUES (p_event_id, v_device_id, 'NOT_FOUND', jsonb_build_object('qr_hash', v_qr_hash));
    
    RETURN jsonb_build_object('result', 'NOT_FOUND');
  END IF;
  
  -- Check if ticket belongs to this event
  IF v_ticket.event_id != p_event_id THEN
    INSERT INTO scan_logs (event_id, ticket_id, device_id, result)
    VALUES (p_event_id, v_ticket.id, v_device_id, 'WRONG_EVENT');
    
    RETURN jsonb_build_object('result', 'WRONG_EVENT');
  END IF;
  
  -- Check ticket status
  IF v_ticket.status = 'used' THEN
    INSERT INTO scan_logs (event_id, ticket_id, device_id, result, details)
    VALUES (p_event_id, v_ticket.id, v_device_id, 'ALREADY_USED', 
            jsonb_build_object('used_at', v_ticket.used_at));
    
    RETURN jsonb_build_object('result', 'ALREADY_USED', 'used_at', v_ticket.used_at);
  END IF;
  
  IF v_ticket.status = 'revoked' THEN
    INSERT INTO scan_logs (event_id, ticket_id, device_id, result)
    VALUES (p_event_id, v_ticket.id, v_device_id, 'REVOKED');
    
    RETURN jsonb_build_object('result', 'REVOKED');
  END IF;
  
  IF v_ticket.status = 'expired' THEN
    INSERT INTO scan_logs (event_id, ticket_id, device_id, result)
    VALUES (p_event_id, v_ticket.id, v_device_id, 'EXPIRED');
    
    RETURN jsonb_build_object('result', 'EXPIRED');
  END IF;
  
  -- Mark ticket as used (atomic update)
  UPDATE tickets
  SET status = 'used', used_at = now(), version = version + 1
  WHERE id = v_ticket.id AND status = 'valid';
  
  IF NOT FOUND THEN
    -- Race condition - ticket was used between SELECT and UPDATE
    INSERT INTO scan_logs (event_id, ticket_id, device_id, result)
    VALUES (p_event_id, v_ticket.id, v_device_id, 'ALREADY_USED');
    
    RETURN jsonb_build_object('result', 'ALREADY_USED');
  END IF;
  
  -- Log success
  INSERT INTO scan_logs (event_id, ticket_id, device_id, result)
  VALUES (p_event_id, v_ticket.id, v_device_id, 'OK');
  
  -- Update device last_seen
  UPDATE scan_devices SET last_seen = now() WHERE id = v_device_id;
  
  RETURN jsonb_build_object(
    'result', 'OK',
    'ticket_id', v_ticket.id,
    'used_at', now()
  );
END;
$$;