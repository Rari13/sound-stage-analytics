-- 1. Table pour stocker l'historique des générations
CREATE TABLE public.generated_flyers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  organizer_id uuid REFERENCES public.organizers(id) NOT NULL,
  image_url text NOT NULL,
  prompt_used text,
  style text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- 2. Index pour la vérification du quota
CREATE INDEX idx_generated_flyers_organizer_date ON public.generated_flyers(organizer_id, created_at DESC);

-- 3. Enable RLS
ALTER TABLE public.generated_flyers ENABLE ROW LEVEL SECURITY;

-- 4. Policy: Organizers can view their own flyers
CREATE POLICY "Organizers can view own flyers"
  ON public.generated_flyers FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.organizers o
    WHERE o.id = generated_flyers.organizer_id
    AND o.owner_user_id = auth.uid()
  ));

-- 5. Policy: Organizers can insert their own flyers
CREATE POLICY "Organizers can insert own flyers"
  ON public.generated_flyers FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.organizers o
    WHERE o.id = generated_flyers.organizer_id
    AND o.owner_user_id = auth.uid()
  ));

-- 6. Policy: Organizers can delete their own flyers
CREATE POLICY "Organizers can delete own flyers"
  ON public.generated_flyers FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.organizers o
    WHERE o.id = generated_flyers.organizer_id
    AND o.owner_user_id = auth.uid()
  ));

-- 7. Create storage bucket for flyers
INSERT INTO storage.buckets (id, name, public)
VALUES ('flyers', 'flyers', true);

-- 8. Storage policy: Anyone can view flyers (public bucket)
CREATE POLICY "Public flyer access"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'flyers');

-- 9. Storage policy: Organizers can upload their own flyers
CREATE POLICY "Organizers can upload flyers"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'flyers' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 10. Storage policy: Organizers can delete their own flyers
CREATE POLICY "Organizers can delete own flyers"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'flyers' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );