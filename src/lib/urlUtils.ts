// URL de production Vercel - TOUJOURS utilisée pour les liens partageables
const PRODUCTION_URL = "https://sound-stage-analytics.vercel.app";

/**
 * Retourne l'URL publique pour les liens partageables
 * TOUJOURS l'URL Vercel pour garantir des liens cohérents
 */
export const getPublicUrl = (): string => {
  return PRODUCTION_URL;
};

/**
 * Construit une URL complète avec le chemin spécifié
 * Utilise toujours l'URL Vercel de production
 */
export const buildShareableUrl = (path: string): string => {
  // S'assurer que le path commence par /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${PRODUCTION_URL}${normalizedPath}`;
};
