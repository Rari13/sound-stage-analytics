-- Fix demand_predictions INSERT policy to be more restrictive
-- Only allow inserts where organizer_id matches the authenticated user's organizer
DROP POLICY IF EXISTS "System can insert demand predictions" ON public.demand_predictions;

-- Organizers can only insert predictions for their own organization
CREATE POLICY "Organizers can insert their own predictions"
ON public.demand_predictions FOR INSERT
TO authenticated
WITH CHECK (
  organizer_id IN (
    SELECT id FROM public.organizers WHERE owner_user_id = auth.uid()
  )
);