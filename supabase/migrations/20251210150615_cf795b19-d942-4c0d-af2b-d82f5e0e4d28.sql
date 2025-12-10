-- Fix: Convert security definer view to regular view
-- First drop the existing view
DROP VIEW IF EXISTS public.public_organizers_view;

-- Recreate as a regular view (SECURITY INVOKER - default)
CREATE VIEW public.public_organizers_view AS
SELECT 
  id,
  created_at,
  name,
  slug,
  bio,
  avatar_url
FROM public.organizers;