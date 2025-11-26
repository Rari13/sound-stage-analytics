-- 1. SÉCURISER LA TABLE ORGANIZERS
-- Supprimer l'ancienne politique trop permissive
DROP POLICY IF EXISTS "Anyone can view published organizers" ON public.organizers;

-- Nouvelle politique : seul l'owner voit toutes ses données sensibles
CREATE POLICY "Owners can view their own organizer data"
ON public.organizers
FOR SELECT
USING (auth.uid() = owner_user_id);

-- Créer une vue publique avec uniquement les colonnes non sensibles
CREATE OR REPLACE VIEW public.public_organizers_view AS
SELECT 
  id,
  name,
  slug,
  bio,
  avatar_url,
  created_at
FROM public.organizers;

-- Donner accès public à la vue
GRANT SELECT ON public.public_organizers_view TO authenticated;
GRANT SELECT ON public.public_organizers_view TO anon;

-- 2. SÉCURISER LA TABLE ORDERS - Ajouter politique UPDATE
CREATE POLICY "Organizers can update orders for their events"
ON public.orders
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM organizers o
    WHERE o.id = orders.organizer_id
    AND o.owner_user_id = auth.uid()
  )
);