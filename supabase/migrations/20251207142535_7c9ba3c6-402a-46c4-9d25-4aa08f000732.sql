-- Create table for ephemeral scan links
CREATE TABLE public.scan_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organizer_id UUID NOT NULL REFERENCES public.organizers(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  device_id UUID NOT NULL REFERENCES public.scan_devices(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Enable RLS
ALTER TABLE public.scan_links ENABLE ROW LEVEL SECURITY;

-- Organizers can manage their own scan links
CREATE POLICY "Organizers can manage their own scan links"
ON public.scan_links
FOR ALL
USING (EXISTS (
  SELECT 1 FROM organizers o
  WHERE o.id = scan_links.organizer_id AND o.owner_user_id = auth.uid()
));

-- Allow public read for active non-expired links (for the scan page)
CREATE POLICY "Anyone can view active scan links by token"
ON public.scan_links
FOR SELECT
USING (is_active = true AND expires_at > now());

-- Index for token lookup
CREATE INDEX idx_scan_links_token ON public.scan_links(token);
CREATE INDEX idx_scan_links_expires ON public.scan_links(expires_at);