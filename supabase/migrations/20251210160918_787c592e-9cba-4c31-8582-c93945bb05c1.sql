-- Create promo_codes table for organizers
CREATE TABLE public.promo_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organizer_id uuid NOT NULL REFERENCES public.organizers(id) ON DELETE CASCADE,
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  code text NOT NULL,
  discount_type text NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value integer NOT NULL CHECK (discount_value > 0),
  usage_limit integer DEFAULT NULL,
  usage_count integer NOT NULL DEFAULT 0,
  starts_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone DEFAULT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(organizer_id, code)
);

-- Enable RLS
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

-- Organizers can manage their own promo codes
CREATE POLICY "Organizers can manage their own promo codes"
ON public.promo_codes
FOR ALL
USING (EXISTS (
  SELECT 1 FROM organizers o
  WHERE o.id = promo_codes.organizer_id
  AND o.owner_user_id = auth.uid()
));

-- Anyone can view active promo codes (needed for validation at checkout)
CREATE POLICY "Anyone can view active promo codes for validation"
ON public.promo_codes
FOR SELECT
USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

-- Trigger for updated_at
CREATE TRIGGER update_promo_codes_updated_at
BEFORE UPDATE ON public.promo_codes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for fast code lookup
CREATE INDEX idx_promo_codes_code ON public.promo_codes(code);
CREATE INDEX idx_promo_codes_organizer ON public.promo_codes(organizer_id);