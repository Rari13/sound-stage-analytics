-- =====================================================
-- YIELD MANAGEMENT TABLES
-- =====================================================

-- 1. Sales Snapshots - Historical sales tracking (CRITICAL P0)
CREATE TABLE public.sales_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  snapshot_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  tickets_sold INTEGER NOT NULL DEFAULT 0,
  revenue_cents INTEGER NOT NULL DEFAULT 0,
  current_price_cents INTEGER,
  days_until_event INTEGER,
  fill_rate NUMERIC(5,4), -- tickets_sold / capacity
  velocity_per_hour NUMERIC(10,4), -- Sales velocity over last 24h
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_sales_snapshots_event_time ON public.sales_snapshots(event_id, snapshot_at);

-- Enable RLS
ALTER TABLE public.sales_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers can view their event snapshots"
ON public.sales_snapshots FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.events e
    JOIN public.organizers o ON e.organizer_id = o.id
    WHERE e.id = sales_snapshots.event_id
    AND o.owner_user_id = auth.uid()
  )
);

-- 2. Price Change Events - Track price elasticity (CRITICAL P0)
CREATE TABLE public.price_change_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  price_tier_id UUID REFERENCES public.price_tiers(id),
  price_before_cents INTEGER NOT NULL,
  price_after_cents INTEGER NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reason TEXT, -- 'manual', 'yield_auto', 'promo', 'tier_switch'
  sales_24h_before INTEGER,
  sales_24h_after INTEGER,
  elasticity_observed NUMERIC(6,4),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.price_change_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers can view their price changes"
ON public.price_change_events FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.events e
    JOIN public.organizers o ON e.organizer_id = o.id
    WHERE e.id = price_change_events.event_id
    AND o.owner_user_id = auth.uid()
  )
);

CREATE POLICY "Organizers can insert price changes"
ON public.price_change_events FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.events e
    JOIN public.organizers o ON e.organizer_id = o.id
    WHERE e.id = price_change_events.event_id
    AND o.owner_user_id = auth.uid()
  )
);

-- 3. No-Show Analytics (IMPORTANT P1)
CREATE TABLE public.no_show_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  segment_type TEXT NOT NULL, -- 'price_tier', 'age_group', 'purchase_timing', 'promo_code'
  segment_value TEXT NOT NULL,
  tickets_sold INTEGER NOT NULL,
  tickets_scanned INTEGER NOT NULL,
  no_show_rate NUMERIC(5,4),
  calculated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.no_show_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers can view their no-show analytics"
ON public.no_show_analytics FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.events e
    JOIN public.organizers o ON e.organizer_id = o.id
    WHERE e.id = no_show_analytics.event_id
    AND o.owner_user_id = auth.uid()
  )
);

-- 4. Competitive Events (IMPORTANT P1)
CREATE TABLE public.competitive_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  competitor_event_id UUID REFERENCES public.events(id), -- NULL if external
  competitor_name TEXT NOT NULL,
  competitor_date DATE NOT NULL,
  competitor_city TEXT NOT NULL,
  competitor_venue TEXT,
  competitor_genre TEXT,
  competitor_capacity INTEGER,
  distance_km NUMERIC(6,2),
  genre_overlap_score NUMERIC(5,4),
  date_overlap_days INTEGER, -- 0 = same day
  impact_score NUMERIC(5,4), -- Estimated impact score
  source TEXT, -- 'internal', 'facebook', 'ra', 'manual'
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.competitive_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers can view competitive events"
ON public.competitive_events FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.events e
    JOIN public.organizers o ON e.organizer_id = o.id
    WHERE e.id = competitive_events.event_id
    AND o.owner_user_id = auth.uid()
  )
);

-- 5. Weather Forecasts (USEFUL P2)
CREATE TABLE public.weather_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city TEXT NOT NULL,
  forecast_date DATE NOT NULL,
  temperature_high_c NUMERIC(4,1),
  temperature_low_c NUMERIC(4,1),
  precipitation_mm NUMERIC(5,1),
  precipitation_probability NUMERIC(5,4),
  weather_condition TEXT,
  weather_score NUMERIC(5,4), -- 0-1, 1 = perfect
  fetched_at TIMESTAMPTZ DEFAULT now(),
  source TEXT, -- 'openweathermap', 'weatherapi'
  UNIQUE(city, forecast_date)
);

ALTER TABLE public.weather_forecasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read weather forecasts"
ON public.weather_forecasts FOR SELECT
USING (true);

-- 6. Calendar Events (USEFUL P2)
CREATE TABLE public.calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_date DATE NOT NULL,
  country TEXT NOT NULL DEFAULT 'FR',
  region TEXT, -- For school vacations by zone
  event_type TEXT NOT NULL, -- 'public_holiday', 'school_vacation', 'festival', 'sports'
  event_name TEXT NOT NULL,
  impact_on_nightlife NUMERIC(5,4), -- Multiplier (1.0 = neutral, 1.5 = boost, 0.5 = penalty)
  notes TEXT,
  UNIQUE(event_date, country, event_name)
);

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read calendar events"
ON public.calendar_events FOR SELECT
USING (true);

-- 7. Yield Management Recommendations
CREATE TABLE public.yield_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  organizer_id UUID NOT NULL REFERENCES public.organizers(id) ON DELETE CASCADE,
  
  -- Current State
  current_tickets_sold INTEGER,
  current_fill_rate NUMERIC(5,4),
  current_price_cents INTEGER,
  days_until_event INTEGER,
  
  -- Predicted vs Actual
  predicted_demand INTEGER,
  actual_velocity NUMERIC(10,4),
  expected_velocity NUMERIC(10,4),
  velocity_ratio NUMERIC(5,4), -- actual / expected
  
  -- Recommendation
  recommended_action TEXT, -- 'increase_price', 'decrease_price', 'hold', 'promo', 'urgency_campaign'
  recommended_price_cents INTEGER,
  price_change_percent NUMERIC(5,2),
  confidence_score NUMERIC(5,4),
  
  -- Risk Assessment
  sell_out_risk TEXT, -- 'undersell', 'on_track', 'oversell_risk'
  revenue_at_risk_cents INTEGER,
  
  -- AI Explanation
  reasoning TEXT,
  
  -- Status
  status TEXT DEFAULT 'pending', -- 'pending', 'applied', 'rejected', 'expired'
  applied_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ
);

ALTER TABLE public.yield_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers can view their yield recommendations"
ON public.yield_recommendations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.organizers
    WHERE organizers.id = yield_recommendations.organizer_id
    AND organizers.owner_user_id = auth.uid()
  )
);

CREATE POLICY "Organizers can update their yield recommendations"
ON public.yield_recommendations FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.organizers
    WHERE organizers.id = yield_recommendations.organizer_id
    AND organizers.owner_user_id = auth.uid()
  )
);

-- Indexes for performance
CREATE INDEX idx_yield_recommendations_event ON public.yield_recommendations(event_id);
CREATE INDEX idx_yield_recommendations_status ON public.yield_recommendations(status);
CREATE INDEX idx_competitive_events_event ON public.competitive_events(event_id);
CREATE INDEX idx_no_show_analytics_event ON public.no_show_analytics(event_id);
CREATE INDEX idx_price_change_events_event ON public.price_change_events(event_id);

-- Add price sensitivity columns to client_profiles
ALTER TABLE public.client_profiles ADD COLUMN IF NOT EXISTS avg_ticket_price_cents INTEGER;
ALTER TABLE public.client_profiles ADD COLUMN IF NOT EXISTS max_ticket_price_cents INTEGER;
ALTER TABLE public.client_profiles ADD COLUMN IF NOT EXISTS promo_usage_rate NUMERIC(5,4);
ALTER TABLE public.client_profiles ADD COLUMN IF NOT EXISTS early_bird_rate NUMERIC(5,4);
ALTER TABLE public.client_profiles ADD COLUMN IF NOT EXISTS last_minute_rate NUMERIC(5,4);
ALTER TABLE public.client_profiles ADD COLUMN IF NOT EXISTS price_sensitivity_score NUMERIC(5,4);
ALTER TABLE public.client_profiles ADD COLUMN IF NOT EXISTS purchase_frequency TEXT;