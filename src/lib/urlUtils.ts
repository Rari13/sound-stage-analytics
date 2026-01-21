import { Capacitor } from "@capacitor/core";

// URL de production Vercel
const PRODUCTION_URL = "https://spark-events-analytics.vercel.app";

/**
 * Retourne l'URL publique pour les liens partageables
 * - Sur app native (iOS/Android): retourne l'URL Vercel
 * - Sur web: retourne l'origin actuel
 */
export const getPublicUrl = (): string => {
  // Si on est sur l'App native (iPhone/Android), on renvoie le lien Web Vercel
  if (Capacitor.isNativePlatform()) {
    return PRODUCTION_URL;
  }
  
  // Si on est déjà sur le Web, on garde l'adresse actuelle
  return window.location.origin;
};

/**
 * Construit une URL complète avec le chemin spécifié
 */
export const buildShareableUrl = (path: string): string => {
  const baseUrl = getPublicUrl();
  // S'assurer que le path commence par /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
};
