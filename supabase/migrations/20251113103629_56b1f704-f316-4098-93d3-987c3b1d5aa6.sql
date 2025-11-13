-- Add Stripe Connect columns to organizers table (only if missing)
DO $$ 
BEGIN
  -- Add stripe_account_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'organizers' 
    AND column_name = 'stripe_account_id'
  ) THEN
    ALTER TABLE public.organizers ADD COLUMN stripe_account_id text;
  END IF;

  -- Add payout_mode if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'organizers' 
    AND column_name = 'payout_mode'
  ) THEN
    ALTER TABLE public.organizers ADD COLUMN payout_mode text DEFAULT 'manual';
  END IF;
END $$;