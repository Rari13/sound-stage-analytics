-- Ajout des colonnes pour la revente de billets
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS is_for_sale boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS resale_price_cents integer,
ADD COLUMN IF NOT EXISTS original_price_cents integer;

-- Politique RLS : Tout le monde peut voir les billets à vendre (pour la marketplace)
CREATE POLICY "Public can view tickets for sale" 
ON tickets FOR SELECT 
USING (is_for_sale = true);

-- Les utilisateurs peuvent mettre à jour leurs propres billets (pour la revente)
CREATE POLICY "Users can update their own tickets for resale"
ON tickets FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);