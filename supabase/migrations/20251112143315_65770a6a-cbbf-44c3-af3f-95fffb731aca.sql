-- Add location and preferences to client_profiles
ALTER TABLE public.client_profiles
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS preferred_genres TEXT[],
  ADD COLUMN IF NOT EXISTS max_distance_km INTEGER DEFAULT 50,
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Create index for location-based queries
CREATE INDEX IF NOT EXISTS idx_client_profiles_location 
  ON public.client_profiles(latitude, longitude);

-- Add location columns to events for better filtering
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- Create index for events location
CREATE INDEX IF NOT EXISTS idx_events_location 
  ON public.events(latitude, longitude);

-- Add published_at timestamp to track when events were published
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE;

-- Create index for published_at
CREATE INDEX IF NOT EXISTS idx_events_published_at 
  ON public.events(published_at DESC);

-- Function to calculate distance between two points (Haversine formula)
CREATE OR REPLACE FUNCTION calculate_distance(
  lat1 DOUBLE PRECISION,
  lon1 DOUBLE PRECISION,
  lat2 DOUBLE PRECISION,
  lon2 DOUBLE PRECISION
)
RETURNS DOUBLE PRECISION
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  R CONSTANT DOUBLE PRECISION := 6371; -- Earth radius in km
  dLat DOUBLE PRECISION;
  dLon DOUBLE PRECISION;
  a DOUBLE PRECISION;
  c DOUBLE PRECISION;
BEGIN
  dLat := radians(lat2 - lat1);
  dLon := radians(lon2 - lon1);
  
  a := sin(dLat/2) * sin(dLat/2) +
       cos(radians(lat1)) * cos(radians(lat2)) *
       sin(dLon/2) * sin(dLon/2);
  
  c := 2 * atan2(sqrt(a), sqrt(1-a));
  
  RETURN R * c;
END;
$$;