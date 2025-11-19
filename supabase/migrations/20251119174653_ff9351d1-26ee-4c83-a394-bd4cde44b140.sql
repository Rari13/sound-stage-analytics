-- Fix the compute_qr_hash function - digest expects text, text
CREATE OR REPLACE FUNCTION public.compute_qr_hash()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Compute SHA256 hash of qr_token - digest expects (text, text)
  NEW.qr_hash := encode(digest(NEW.qr_token, 'sha256'), 'hex');
  RETURN NEW;
END;
$$;