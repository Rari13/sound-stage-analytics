-- Table pour stocker les interactions de découverte
CREATE TABLE public.swipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('left', 'right')),
  filters_context JSONB, 
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index pour accélérer les analyses IA
CREATE INDEX idx_swipes_event_id ON public.swipes(event_id);
CREATE INDEX idx_swipes_user_id ON public.swipes(user_id);

-- RLS (Sécurité)
ALTER TABLE public.swipes ENABLE ROW LEVEL SECURITY;

-- Les utilisateurs peuvent insérer leurs propres swipes
CREATE POLICY "Users can insert their own swipes"
ON public.swipes FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Les organisateurs peuvent voir les statistiques de LEURS événements uniquement
CREATE POLICY "Organizers can view swipes for their events"
ON public.swipes FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.events e
  JOIN public.organizers o ON o.id = e.organizer_id
  WHERE e.id = swipes.event_id
  AND o.owner_user_id = auth.uid()
));