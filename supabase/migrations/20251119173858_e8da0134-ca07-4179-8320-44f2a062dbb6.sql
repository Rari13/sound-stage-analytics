-- Create function to compute qr_hash automatically
CREATE OR REPLACE FUNCTION public.compute_qr_hash()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Compute SHA256 hash of qr_token
  NEW.qr_hash := encode(digest(NEW.qr_token, 'sha256'), 'hex');
  RETURN NEW;
END;
$$;

-- Create trigger to compute qr_hash on insert or update
DROP TRIGGER IF EXISTS compute_qr_hash_trigger ON public.tickets;
CREATE TRIGGER compute_qr_hash_trigger
BEFORE INSERT OR UPDATE OF qr_token ON public.tickets
FOR EACH ROW
EXECUTE FUNCTION public.compute_qr_hash();

-- Update all existing tickets to compute their qr_hash
UPDATE public.tickets
SET qr_hash = encode(digest(qr_token, 'sha256'), 'hex')
WHERE qr_hash IS NULL;