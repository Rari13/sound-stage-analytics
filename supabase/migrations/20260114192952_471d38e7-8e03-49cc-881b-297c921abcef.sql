-- ============================================================
-- MODÈLE IPC/MPDU - Tables pour l'Intelligence Prédictive
-- ============================================================

-- Table des profils d'artistes (pour le calcul IPC)
CREATE TABLE IF NOT EXISTS public.artist_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  spotify_id TEXT UNIQUE,
  genres TEXT[] DEFAULT '{}',
  -- Vecteur de profil pour le matching (genres/styles normalisés)
  profile_vector JSONB DEFAULT '{}',
  -- Scores externes (streaming, réseaux sociaux)
  external_popularity_score NUMERIC(5,4) DEFAULT 0,
  monthly_listeners INTEGER DEFAULT 0,
  social_followers INTEGER DEFAULT 0,
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table des profils de lieux (venues)
CREATE TABLE IF NOT EXISTS public.venue_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  venue_name TEXT NOT NULL,
  city TEXT NOT NULL,
  population INTEGER DEFAULT 0,
  venue_type TEXT, -- 'club', 'warehouse', 'festival', 'bar'
  capacity INTEGER DEFAULT 0,
  -- Vecteur de profil clientèle (construit à partir des ordres passés)
  profile_vector JSONB DEFAULT '{}',
  -- Coordonnées
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  -- Metadata
  organizer_id UUID REFERENCES public.organizers(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table des performances passées (pour F_sat - saturation)
CREATE TABLE IF NOT EXISTS public.artist_performances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_id UUID REFERENCES public.artist_profiles(id) ON DELETE CASCADE,
  artist_name TEXT NOT NULL, -- Fallback si pas de profil
  city TEXT NOT NULL,
  venue_id UUID REFERENCES public.venue_profiles(id) ON DELETE SET NULL,
  event_date DATE NOT NULL,
  tickets_sold INTEGER DEFAULT 0,
  capacity INTEGER DEFAULT 0,
  revenue_cents INTEGER DEFAULT 0,
  -- Lien optionnel avec un événement existant
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  organizer_id UUID REFERENCES public.organizers(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table des prédictions de demande (cache des calculs IPC/MPDU)
CREATE TABLE IF NOT EXISTS public.demand_predictions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  organizer_id UUID REFERENCES public.organizers(id) ON DELETE CASCADE,
  -- Composantes IPC
  ipc_base NUMERIC(5,4) DEFAULT 0,
  f_sat NUMERIC(5,4) DEFAULT 1,
  m_la NUMERIC(5,4) DEFAULT 0.5,
  ipc_score NUMERIC(5,4) DEFAULT 0,
  -- Prédiction de demande
  expected_demand INTEGER DEFAULT 0,
  demand_std_deviation NUMERIC(8,2) DEFAULT 0,
  confidence_interval_low INTEGER DEFAULT 0,
  confidence_interval_high INTEGER DEFAULT 0,
  sell_out_probability NUMERIC(5,4) DEFAULT 0,
  -- Pricing recommandé
  recommended_price_cents INTEGER DEFAULT 0,
  optimal_price_cents INTEGER DEFAULT 0,
  -- Facteurs contextuels
  weather_factor NUMERIC(4,3) DEFAULT 1.0,
  seasonality_factor NUMERIC(4,3) DEFAULT 1.0,
  competition_factor NUMERIC(4,3) DEFAULT 1.0,
  -- Courbe de Bass (JSON avec les points de la courbe)
  bass_curve JSONB DEFAULT '[]',
  -- Metadata
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '24 hours'),
  version INTEGER DEFAULT 1
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_artist_performances_city ON public.artist_performances(city);
CREATE INDEX IF NOT EXISTS idx_artist_performances_artist_city ON public.artist_performances(artist_name, city);
CREATE INDEX IF NOT EXISTS idx_demand_predictions_event ON public.demand_predictions(event_id);
CREATE INDEX IF NOT EXISTS idx_demand_predictions_organizer ON public.demand_predictions(organizer_id);
CREATE INDEX IF NOT EXISTS idx_venue_profiles_city ON public.venue_profiles(city);

-- RLS Policies
ALTER TABLE public.artist_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venue_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artist_performances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demand_predictions ENABLE ROW LEVEL SECURITY;

-- Lecture publique des profils artistes (données agrégées)
CREATE POLICY "Artist profiles are publicly readable"
  ON public.artist_profiles FOR SELECT
  USING (true);

-- Venue profiles lisibles par tous mais éditables par propriétaire
CREATE POLICY "Venue profiles are publicly readable"
  ON public.venue_profiles FOR SELECT
  USING (true);

CREATE POLICY "Organizers can manage their venue profiles"
  ON public.venue_profiles FOR ALL
  USING (
    organizer_id IN (
      SELECT id FROM public.organizers WHERE owner_user_id = auth.uid()
    )
  );

-- Artist performances gérées par l'organisateur
CREATE POLICY "Organizers can manage their artist performances"
  ON public.artist_performances FOR ALL
  USING (
    organizer_id IN (
      SELECT id FROM public.organizers WHERE owner_user_id = auth.uid()
    )
  );

CREATE POLICY "Artist performances are readable by organizer"
  ON public.artist_performances FOR SELECT
  USING (
    organizer_id IN (
      SELECT id FROM public.organizers WHERE owner_user_id = auth.uid()
    )
  );

-- Demand predictions accessibles uniquement par l'organisateur
CREATE POLICY "Organizers can view their demand predictions"
  ON public.demand_predictions FOR SELECT
  USING (
    organizer_id IN (
      SELECT id FROM public.organizers WHERE owner_user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert demand predictions"
  ON public.demand_predictions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Organizers can delete their demand predictions"
  ON public.demand_predictions FOR DELETE
  USING (
    organizer_id IN (
      SELECT id FROM public.organizers WHERE owner_user_id = auth.uid()
    )
  );

-- Fonction pour calculer la pression de saturation P_sat
CREATE OR REPLACE FUNCTION public.calculate_saturation_pressure(
  p_artist_name TEXT,
  p_city TEXT,
  p_lambda NUMERIC DEFAULT 0.00385
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pressure NUMERIC := 0;
  v_days_ago INTEGER;
  v_contribution NUMERIC;
BEGIN
  -- Calcul de la pression de saturation basée sur les performances passées
  FOR v_days_ago IN 
    SELECT EXTRACT(DAY FROM (now() - event_date))::INTEGER
    FROM artist_performances
    WHERE artist_name ILIKE p_artist_name
      AND city ILIKE p_city
      AND event_date >= (now() - interval '2 years')
  LOOP
    v_contribution := exp(-p_lambda * v_days_ago);
    v_pressure := v_pressure + v_contribution;
  END LOOP;
  
  RETURN v_pressure;
END;
$$;

-- Fonction pour calculer F_sat
CREATE OR REPLACE FUNCTION public.calculate_f_sat(
  p_artist_name TEXT,
  p_city TEXT,
  p_population INTEGER DEFAULT 200000
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_p_sat NUMERIC;
  v_k NUMERIC;
BEGIN
  v_p_sat := calculate_saturation_pressure(p_artist_name, p_city);
  
  -- k dépend de la taille de la ville
  IF p_population < 200000 THEN
    v_k := 1.0;
  ELSE
    v_k := 0.5;
  END IF;
  
  RETURN 1.0 / (1.0 + v_k * v_p_sat);
END;
$$;

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER update_artist_profiles_updated_at
  BEFORE UPDATE ON public.artist_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_venue_profiles_updated_at
  BEFORE UPDATE ON public.venue_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();