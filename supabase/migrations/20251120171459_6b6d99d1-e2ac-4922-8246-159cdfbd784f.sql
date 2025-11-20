-- Drop the problematic trigger that computes QR hash
-- The qr_hash is not used in the current validation flow (validate_ticket uses qr_token directly)
DROP TRIGGER IF EXISTS compute_qr_hash_trigger ON tickets;

-- Drop the trigger function as well
DROP FUNCTION IF EXISTS public.compute_qr_hash();