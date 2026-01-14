-- Create event_simulations table for pre-event profitability analysis
CREATE TABLE public.event_simulations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organizer_id UUID NOT NULL REFERENCES public.organizers(id) ON DELETE CASCADE,
  artist_id UUID REFERENCES public.artist_profiles(id),
  artist_name TEXT NOT NULL,
  venue_id UUID REFERENCES public.venue_profiles(id),
  venue_name TEXT NOT NULL,
  city TEXT NOT NULL,
  cachet_cents INTEGER NOT NULL,
  capacity INTEGER NOT NULL,
  target_date DATE,
  
  -- IPC Scores
  ipc_base NUMERIC(5,4),
  f_sat NUMERIC(5,4),
  m_la NUMERIC(5,4),
  ipc_score NUMERIC(5,4),
  
  -- Demand predictions
  expected_demand NUMERIC(10,2),
  demand_std_deviation NUMERIC(10,2),
  confidence_interval_low NUMERIC(10,2),
  confidence_interval_high NUMERIC(10,2),
  sell_out_probability NUMERIC(5,4),
  
  -- Pricing
  recommended_price_cents INTEGER,
  optimal_price_cents INTEGER,
  
  -- Profitability
  expected_revenue_cents INTEGER,
  expected_profit_cents INTEGER,
  profit_margin NUMERIC(5,4),
  break_even_tickets INTEGER,
  is_viable BOOLEAN DEFAULT false,
  
  -- Risk factors
  competition_factor NUMERIC(5,4),
  seasonality_factor NUMERIC(5,4),
  weather_factor NUMERIC(5,4),
  
  -- AI insights
  ai_recommendation TEXT,
  risk_assessment TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.event_simulations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Organizers can view their own simulations"
ON public.event_simulations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.organizers
    WHERE organizers.id = event_simulations.organizer_id
    AND organizers.owner_user_id = auth.uid()
  )
);

CREATE POLICY "Organizers can create their own simulations"
ON public.event_simulations
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.organizers
    WHERE organizers.id = event_simulations.organizer_id
    AND organizers.owner_user_id = auth.uid()
  )
);

CREATE POLICY "Organizers can update their own simulations"
ON public.event_simulations
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.organizers
    WHERE organizers.id = event_simulations.organizer_id
    AND organizers.owner_user_id = auth.uid()
  )
);

CREATE POLICY "Organizers can delete their own simulations"
ON public.event_simulations
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.organizers
    WHERE organizers.id = event_simulations.organizer_id
    AND organizers.owner_user_id = auth.uid()
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_event_simulations_updated_at
BEFORE UPDATE ON public.event_simulations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_event_simulations_organizer_id ON public.event_simulations(organizer_id);
CREATE INDEX idx_event_simulations_created_at ON public.event_simulations(created_at DESC);