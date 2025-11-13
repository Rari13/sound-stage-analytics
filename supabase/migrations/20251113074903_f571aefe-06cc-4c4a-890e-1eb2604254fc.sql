-- Create subscriptions table for organizers
CREATE TABLE public.organizer_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organizer_id UUID NOT NULL REFERENCES public.organizers(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('free', 'premium')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  monthly_price_cents INTEGER NOT NULL DEFAULT 0,
  stripe_subscription_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.organizer_subscriptions ENABLE ROW LEVEL SECURITY;

-- Organizers can view their own subscription
CREATE POLICY "Organizers can view their own subscription"
  ON public.organizer_subscriptions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organizers o
      WHERE o.id = organizer_subscriptions.organizer_id
      AND o.owner_user_id = auth.uid()
    )
  );

-- Organizers can insert their own subscription
CREATE POLICY "Organizers can create their own subscription"
  ON public.organizer_subscriptions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organizers o
      WHERE o.id = organizer_subscriptions.organizer_id
      AND o.owner_user_id = auth.uid()
    )
  );

-- Organizers can update their own subscription
CREATE POLICY "Organizers can update their own subscription"
  ON public.organizer_subscriptions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organizers o
      WHERE o.id = organizer_subscriptions.organizer_id
      AND o.owner_user_id = auth.uid()
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER update_organizer_subscriptions_updated_at
  BEFORE UPDATE ON public.organizer_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create default free subscription for existing organizers
INSERT INTO public.organizer_subscriptions (organizer_id, plan_type, monthly_price_cents)
SELECT id, 'free', 0 FROM public.organizers
ON CONFLICT DO NOTHING;