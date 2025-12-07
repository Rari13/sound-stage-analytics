-- Create refund_requests table
CREATE TABLE public.refund_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.tickets(id),
  order_id UUID NOT NULL REFERENCES public.orders(id),
  event_id UUID NOT NULL REFERENCES public.events(id),
  user_id UUID NOT NULL,
  organizer_id UUID NOT NULL REFERENCES public.organizers(id),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  responded_at TIMESTAMP WITH TIME ZONE,
  response_message TEXT
);

-- Enable RLS
ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;

-- Clients can view their own refund requests
CREATE POLICY "Users can view their own refund requests"
ON public.refund_requests
FOR SELECT
USING (auth.uid() = user_id);

-- Clients can create refund requests for their own tickets
CREATE POLICY "Users can create refund requests for their tickets"
ON public.refund_requests
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM tickets t
    WHERE t.id = refund_requests.ticket_id
    AND t.user_id = auth.uid()
    AND t.status = 'valid'
  )
);

-- Organizers can view refund requests for their events
CREATE POLICY "Organizers can view refund requests for their events"
ON public.refund_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM organizers o
    WHERE o.id = refund_requests.organizer_id
    AND o.owner_user_id = auth.uid()
  )
);

-- Organizers can update refund requests for their events
CREATE POLICY "Organizers can update refund requests"
ON public.refund_requests
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM organizers o
    WHERE o.id = refund_requests.organizer_id
    AND o.owner_user_id = auth.uid()
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_refund_requests_updated_at
BEFORE UPDATE ON public.refund_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();