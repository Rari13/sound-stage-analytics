// URL de production configurable via variable d'environnement
// Fallback automatique selon l'environnement
const getProductionUrl = (): string => {
  // Priorité 1: Variable d'environnement explicite
  if (import.meta.env.VITE_PUBLIC_URL) {
    return (import.meta.env.VITE_PUBLIC_URL as string).replace(/\/$/, ''); // Remove trailing slash
  }
  
  // Priorité 2: En production Vercel, utiliser l'origine actuelle
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    // Exclure les environnements non-production
    if (!origin.includes('localhost') &&
        !origin.includes('lovable') &&
        !origin.includes('capacitor') &&
        origin.includes('vercel.app')) {
      return origin;
    }
  }
  
  // Fallback: URL par défaut
  return "https://spark-events-analytics.vercel.app";
};

/**
 * Retourne l'URL publique pour les liens partageables
 */
export const getPublicUrl = (): string => {
  return getProductionUrl();
};

/**
 * Construit une URL complète avec le chemin spécifié
 * Utilise l'URL de production configurée
 */
export const buildShareableUrl = (path: string): string => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getProductionUrl()}${normalizedPath}`;
};
