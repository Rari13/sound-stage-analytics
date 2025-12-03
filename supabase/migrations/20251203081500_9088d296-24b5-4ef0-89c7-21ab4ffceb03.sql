-- Create historical_events table for CSV imports and AI analysis
CREATE TABLE public.historical_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id UUID NOT NULL REFERENCES public.organizers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  tickets_sold INTEGER DEFAULT 0,
  revenue_cents INTEGER DEFAULT 0,
  city TEXT,
  genre TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.historical_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Organizers can view their own historical events"
ON public.historical_events FOR SELECT
USING (EXISTS (
  SELECT 1 FROM organizers o
  WHERE o.id = historical_events.organizer_id
  AND o.owner_user_id = auth.uid()
));

CREATE POLICY "Organizers can insert their own historical events"
ON public.historical_events FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM organizers o
  WHERE o.id = historical_events.organizer_id
  AND o.owner_user_id = auth.uid()
));

CREATE POLICY "Organizers can delete their own historical events"
ON public.historical_events FOR DELETE
USING (EXISTS (
  SELECT 1 FROM organizers o
  WHERE o.id = historical_events.organizer_id
  AND o.owner_user_id = auth.uid()
));

-- Add index for faster queries
CREATE INDEX idx_historical_events_organizer ON public.historical_events(organizer_id);
CREATE INDEX idx_historical_events_date ON public.historical_events(date);