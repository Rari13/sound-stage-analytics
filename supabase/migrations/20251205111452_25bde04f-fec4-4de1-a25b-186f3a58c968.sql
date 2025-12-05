-- Add survey_completed_at column to track if post-event survey was completed
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS survey_completed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

COMMENT ON COLUMN public.events.survey_completed_at IS 'Timestamp when organizer completed the post-event survey. NULL means not yet completed.';