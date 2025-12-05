-- Ajouter des colonnes pour la commission personnalisée dans la table organizers
ALTER TABLE public.organizers 
ADD COLUMN IF NOT EXISTS custom_commission_rate_bps INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS custom_commission_fixed_cents INTEGER DEFAULT NULL;

-- Commentaire pour expliquer la logique
COMMENT ON COLUMN public.organizers.custom_commission_rate_bps IS 'Si défini, remplace le taux du plan standard. En points de base (100 = 1%).';
COMMENT ON COLUMN public.organizers.custom_commission_fixed_cents IS 'Si défini, remplace le fixe du plan standard. En centimes.';