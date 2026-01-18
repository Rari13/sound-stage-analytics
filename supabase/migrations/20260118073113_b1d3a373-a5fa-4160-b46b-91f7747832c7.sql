-- Drop the problematic policies causing infinite recursion
DROP POLICY IF EXISTS "Users can view group orders they created or participate in" ON public.group_orders;
DROP POLICY IF EXISTS "Authenticated users can view group orders by share code" ON public.group_orders;
DROP POLICY IF EXISTS "Authenticated users can create group orders" ON public.group_orders;

-- Create simpler, non-recursive policies
-- Anyone can view group orders (needed for share code access)
CREATE POLICY "Anyone can view group orders"
ON public.group_orders
FOR SELECT
USING (true);

-- Authenticated users can create group orders where they are the creator
CREATE POLICY "Users can create their own group orders"
ON public.group_orders
FOR INSERT
WITH CHECK (auth.uid() = creator_user_id);