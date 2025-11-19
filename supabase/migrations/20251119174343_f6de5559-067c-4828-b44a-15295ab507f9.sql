-- Fix the compute_qr_hash function with proper type casting
CREATE OR REPLACE FUNCTION public.compute_qr_hash()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Compute SHA256 hash of qr_token with explicit type cast
  NEW.qr_hash := encode(digest(NEW.qr_token::bytea, 'sha256'::text), 'hex');
  RETURN NEW;
END;
$$;