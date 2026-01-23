/**
 * URL Utilities for Shareable Links
 * 
 * Ce module gère la génération d'URLs partageables qui fonctionnent
 * dans tous les environnements (web, app native iOS/Android, preview).
 * 
 * Types de liens supportés:
 * - /events/:slug        → Page d'achat de billets (client)
 * - /scan/:token         → Page de scan de billets (staff)
 * - /group-pay/:code     → Page de paiement groupé (participants)
 */

// URL de production par défaut
const DEFAULT_PRODUCTION_URL = "https://spark-events-analytics.vercel.app";

/**
 * Détecte si l'application tourne dans un environnement Capacitor (app native)
 */
const isCapacitorEnvironment = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  // Vérifier si Capacitor est présent
  const hasCapacitor = !!(window as any).Capacitor;
  
  // Vérifier les schémas d'URL typiques de Capacitor
  const origin = window.location.origin;
  const isCapacitorScheme = origin.includes('capacitor://') || 
                            origin.includes('ionic://') ||
                            origin === 'http://localhost' ||
                            origin.startsWith('file://');
  
  return hasCapacitor || isCapacitorScheme;
};

/**
 * Détecte si l'application tourne dans un environnement de preview Lovable
 */
const isLovablePreview = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.location.origin.includes('lovable');
};

/**
 * Détecte si l'application tourne en production Vercel
 */
const isVercelProduction = (): boolean => {
  if (typeof window === 'undefined') return false;
  const origin = window.location.origin;
  return origin.includes('vercel.app') && 
         !origin.includes('localhost') &&
         !origin.includes('lovable');
};

/**
 * Obtient l'URL de production pour les liens partageables
 * 
 * Priorité:
 * 1. Variable d'environnement VITE_PUBLIC_URL (si définie)
 * 2. URL actuelle si en production Vercel
 * 3. URL par défaut (spark-events-analytics.vercel.app)
 */
const getProductionUrl = (): string => {
  // Priorité 1: Variable d'environnement explicite
  if (import.meta.env.VITE_PUBLIC_URL) {
    const url = import.meta.env.VITE_PUBLIC_URL as string;
    return url.replace(/\/$/, ''); // Supprimer le slash final
  }
  
  // Priorité 2: En production Vercel, utiliser l'origine actuelle
  if (isVercelProduction()) {
    return window.location.origin;
  }
  
  // Fallback: URL par défaut
  return DEFAULT_PRODUCTION_URL;
};

/**
 * Retourne l'URL publique de base pour les liens partageables
 * 
 * @returns L'URL de production (ex: https://spark-events-analytics.vercel.app)
 */
export const getPublicUrl = (): string => {
  return getProductionUrl();
};

/**
 * Construit une URL complète partageable avec le chemin spécifié
 * 
 * Cette fonction garantit que les liens générés depuis n'importe quel
 * environnement (app native, preview, production) pointent toujours
 * vers l'URL de production web.
 * 
 * @param path - Le chemin de la route (ex: '/events/mon-evenement')
 * @returns L'URL complète (ex: 'https://spark-events-analytics.vercel.app/events/mon-evenement')
 * 
 * @example
 * // Lien pour un événement (page d'achat client)
 * buildShareableUrl('/events/concert-2024')
 * // → https://spark-events-analytics.vercel.app/events/concert-2024
 * 
 * @example
 * // Lien pour le scan de billets (staff)
 * buildShareableUrl('/scan/abc123-token')
 * // → https://spark-events-analytics.vercel.app/scan/abc123-token
 * 
 * @example
 * // Lien pour Group Pay (participants)
 * buildShareableUrl('/group-pay/SHARE123')
 * // → https://spark-events-analytics.vercel.app/group-pay/SHARE123
 */
export const buildShareableUrl = (path: string): string => {
  const baseUrl = getProductionUrl();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
};

/**
 * Construit un lien de partage pour un événement
 * @param slug - Le slug de l'événement
 */
export const buildEventShareUrl = (slug: string): string => {
  return buildShareableUrl(`/events/${slug}`);
};

/**
 * Construit un lien de scan pour le staff
 * @param token - Le token du lien de scan
 */
export const buildScanShareUrl = (token: string): string => {
  return buildShareableUrl(`/scan/${token}`);
};

/**
 * Construit un lien Group Pay pour les participants
 * @param shareCode - Le code de partage du groupe
 */
export const buildGroupPayShareUrl = (shareCode: string): string => {
  return buildShareableUrl(`/group-pay/${shareCode}`);
};

/**
 * Informations de debug sur l'environnement actuel
 * Utile pour le débogage des problèmes de liens
 */
export const getEnvironmentInfo = (): {
  isCapacitor: boolean;
  isLovable: boolean;
  isVercel: boolean;
  currentOrigin: string;
  productionUrl: string;
} => {
  return {
    isCapacitor: isCapacitorEnvironment(),
    isLovable: isLovablePreview(),
    isVercel: isVercelProduction(),
    currentOrigin: typeof window !== 'undefined' ? window.location.origin : 'server',
    productionUrl: getProductionUrl(),
  };
};
