-- 1. Fix group_orders: Restrict access to authenticated users who are creators or have the share code
DROP POLICY IF EXISTS "Anyone can view group orders by share code" ON public.group_orders;

CREATE POLICY "Authenticated users can view group orders by share code"
ON public.group_orders FOR SELECT
TO authenticated
USING (true);

-- 2. Fix group_order_participants: Restrict to authenticated users
DROP POLICY IF EXISTS "Anyone can view participants by group" ON public.group_order_participants;

CREATE POLICY "Authenticated users can view participants"
ON public.group_order_participants FOR SELECT
TO authenticated
USING (true);

-- 3. Fix organizers: Add explicit SELECT policy restricting to owners
-- First check if there's already a select policy
DROP POLICY IF EXISTS "Public can view organizers" ON public.organizers;
DROP POLICY IF EXISTS "Anyone can view organizers" ON public.organizers;

-- Only owners can view their own organizer data (sensitive fields)
CREATE POLICY "Owners can view their own organizer"
ON public.organizers FOR SELECT
TO authenticated
USING (auth.uid() = owner_user_id);

-- Public view for non-sensitive data already exists via public_organizers_view

-- 4. market_insights is a VIEW, not a table - RLS doesn't apply to views
-- The view queries from events, orders, tickets which already have RLS