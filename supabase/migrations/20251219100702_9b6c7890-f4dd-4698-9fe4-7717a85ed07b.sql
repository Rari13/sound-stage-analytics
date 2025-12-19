-- Vue sécurisée "Market Intelligence" adaptée au schéma actuel
-- Agrège les données de marché par ville et genre musical

CREATE OR REPLACE VIEW public.market_insights AS
SELECT 
  e.city AS ville,
  unnest(e.music_genres) AS genre,
  to_char(e.starts_at, 'YYYY-MM') AS mois,
  COUNT(DISTINCT e.organizer_id) AS nb_organisateurs,
  COUNT(e.id) AS nb_evenements,
  COALESCE(SUM(ticket_counts.total_tickets), 0) AS total_volume_billets,
  ROUND(AVG(price_data.avg_price_cents) / 100.0, 2) AS prix_moyen_marche,
  CASE 
    WHEN SUM(e.capacity) > 0 THEN 
      ROUND((COALESCE(SUM(ticket_counts.total_tickets), 0)::numeric / SUM(e.capacity)::numeric) * 100, 2)
    ELSE 0 
  END AS remplissage_moyen
FROM events e
LEFT JOIN (
  SELECT event_id, COUNT(*) AS total_tickets
  FROM tickets
  WHERE status = 'valid' OR status = 'used'
  GROUP BY event_id
) ticket_counts ON ticket_counts.event_id = e.id
LEFT JOIN (
  SELECT event_id, AVG(price_cents) AS avg_price_cents
  FROM price_tiers
  GROUP BY event_id
) price_data ON price_data.event_id = e.id
WHERE e.starts_at > (CURRENT_DATE - INTERVAL '1 year')
  AND e.status = 'published'
GROUP BY e.city, unnest(e.music_genres), to_char(e.starts_at, 'YYYY-MM');

-- Fonction sécurisée pour l'API (Règle des 3 Organisateurs pour l'anonymat)
CREATE OR REPLACE FUNCTION public.get_market_trends(target_city text, target_genre text)
RETURNS TABLE (
  mois text,
  volume_billets bigint,
  prix_moyen numeric,
  remplissage numeric,
  trend_status text
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mi.mois,
    mi.total_volume_billets,
    mi.prix_moyen_marche,
    mi.remplissage_moyen,
    CASE 
      WHEN mi.remplissage_moyen > 85 THEN 'HOT'
      WHEN mi.remplissage_moyen < 50 THEN 'COLD'
      ELSE 'NEUTRAL'
    END AS trend_status
  FROM market_insights mi
  WHERE LOWER(mi.ville) = LOWER(target_city)
    AND LOWER(mi.genre) = LOWER(target_genre)
    AND mi.nb_organisateurs >= 3 -- Règle d'anonymat : min 3 organisateurs
  ORDER BY mi.mois DESC;
END;
$$;