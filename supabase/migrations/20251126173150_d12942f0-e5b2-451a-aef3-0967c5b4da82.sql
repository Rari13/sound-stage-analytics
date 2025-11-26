-- Update validate_ticket to use qr_token directly instead of computing qr_hash
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
  
  -- Find ticket directly by qr_token (no hash computation needed)
  SELECT * INTO v_ticket
  FROM tickets
  WHERE qr_token = p_qr_token
  FOR UPDATE;
  
  IF NOT FOUND THEN
    INSERT INTO scan_logs (event_id, device_id, result, details)
    VALUES (p_event_id, v_device_id, 'NOT_FOUND', jsonb_build_object('qr_token', p_qr_token));
    
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