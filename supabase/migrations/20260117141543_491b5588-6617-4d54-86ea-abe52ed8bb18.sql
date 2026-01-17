-- Drop the insecure public view
DROP VIEW IF EXISTS public.market_insights;

-- Create a secure RPC function that only authenticated organizers can access
CREATE OR REPLACE FUNCTION public.get_secure_market_insights(
  target_city text DEFAULT NULL,
  target_genre text DEFAULT NULL
)
RETURNS TABLE (
  ville text,
  genre text,
  mois text,
  nb_organisateurs bigint,
  nb_evenements bigint,
  total_volume_billets bigint,
  prix_moyen_marche numeric,
  remplissage_moyen numeric
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  -- Verify the user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Verify the user is an organizer
  IF NOT EXISTS (
    SELECT 1 FROM public.organizers 
    WHERE owner_user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Only organizers can access market insights';
  END IF;
  
  -- Return filtered market data
  RETURN QUERY
  SELECT 
    e.city as ville,
    COALESCE(e.music_genres[1], 'Unknown') as genre,
    to_char(e.starts_at, 'YYYY-MM') as mois,
    count(distinct e.organizer_id) as nb_organisateurs,
    count(e.id) as nb_evenements,
    COALESCE(sum((
      SELECT count(*) FROM public.tickets t 
      WHERE t.event_id = e.id AND t.status = 'valid'
    )), 0)::bigint as total_volume_billets,
    round(avg(COALESCE((
      SELECT avg(pt.price_cents) FROM public.price_tiers pt 
      WHERE pt.event_id = e.id
    ), 0)), 2) as prix_moyen_marche,
    round(avg(
      CASE 
        WHEN e.capacity IS NOT NULL AND e.capacity > 0 THEN
          ((SELECT count(*) FROM public.tickets t WHERE t.event_id = e.id AND t.status = 'valid')::numeric / e.capacity) * 100
        ELSE 0
      END
    ), 2) as remplissage_moyen
  FROM public.events e
  WHERE e.starts_at > (current_date - interval '1 year')
    AND (target_city IS NULL OR e.city ILIKE '%' || target_city || '%')
    AND (target_genre IS NULL OR target_genre = ANY(e.music_genres))
  GROUP BY e.city, COALESCE(e.music_genres[1], 'Unknown'), to_char(e.starts_at, 'YYYY-MM')
  ORDER BY mois DESC, ville, genre;
END;
$$;