-- Fix compute_qr_hash - explicitly cast both arguments to text
CREATE OR REPLACE FUNCTION public.compute_qr_hash()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Compute SHA256 hash with explicit text casting for both arguments
  NEW.qr_hash := encode(digest(NEW.qr_token::text, 'sha256'::text), 'hex');
  RETURN NEW;
END;
$$;