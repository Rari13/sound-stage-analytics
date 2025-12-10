-- Add policy for users to view their own swipes
CREATE POLICY "Users can view their own swipes"
ON public.swipes
FOR SELECT
USING (auth.uid() = user_id);