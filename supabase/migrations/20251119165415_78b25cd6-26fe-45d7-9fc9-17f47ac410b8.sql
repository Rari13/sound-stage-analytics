-- Supprimer l'ancienne contrainte qui bloque les prix à 0€
ALTER TABLE price_tiers 
DROP CONSTRAINT IF EXISTS price_tiers_price_cents_check;

-- Ajouter une nouvelle contrainte qui autorise les prix >= 0 (tarifs gratuits autorisés)
ALTER TABLE price_tiers 
ADD CONSTRAINT price_tiers_price_cents_check CHECK (price_cents >= 0);