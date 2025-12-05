-- Table pour les commandes de groupe (Group Pay)
CREATE TABLE public.group_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  creator_user_id uuid NOT NULL,
  total_tickets integer NOT NULL,
  price_per_ticket_cents integer NOT NULL,
  share_code text NOT NULL UNIQUE DEFAULT generate_short_code(),
  status text NOT NULL DEFAULT 'pending', -- pending, complete, expired, cancelled
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Table pour les participants au groupe
CREATE TABLE public.group_order_participants (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_order_id uuid NOT NULL REFERENCES public.group_orders(id) ON DELETE CASCADE,
  user_id uuid, -- peut être null si pas encore inscrit
  email text NOT NULL,
  amount_cents integer NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending, paid, refunded
  stripe_payment_intent_id text,
  paid_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.group_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_order_participants ENABLE ROW LEVEL SECURITY;

-- Policies pour group_orders
CREATE POLICY "Users can view group orders they created or participate in"
ON public.group_orders FOR SELECT
USING (
  creator_user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM group_order_participants gop
    WHERE gop.group_order_id = group_orders.id AND gop.user_id = auth.uid()
  )
);

CREATE POLICY "Anyone can view group orders by share code"
ON public.group_orders FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create group orders"
ON public.group_orders FOR INSERT
WITH CHECK (auth.uid() = creator_user_id AND is_email_confirmed(auth.uid()));

CREATE POLICY "Creators can update their group orders"
ON public.group_orders FOR UPDATE
USING (auth.uid() = creator_user_id);

-- Policies pour group_order_participants
CREATE POLICY "Users can view participants in their groups"
ON public.group_order_participants FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM group_orders go
    WHERE go.id = group_order_participants.group_order_id
    AND (go.creator_user_id = auth.uid() OR group_order_participants.user_id = auth.uid())
  )
);

CREATE POLICY "Anyone can view participants by group"
ON public.group_order_participants FOR SELECT
USING (true);

CREATE POLICY "Group creators can add participants"
ON public.group_order_participants FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM group_orders go
    WHERE go.id = group_order_participants.group_order_id
    AND go.creator_user_id = auth.uid()
  )
);

CREATE POLICY "Participants can update their own status"
ON public.group_order_participants FOR UPDATE
USING (user_id = auth.uid() OR user_id IS NULL);

-- Index pour les recherches par share_code
CREATE INDEX idx_group_orders_share_code ON public.group_orders(share_code);
CREATE INDEX idx_group_order_participants_group_id ON public.group_order_participants(group_order_id);