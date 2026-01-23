/**
 * Browser Utilities for Cross-Platform URL Opening
 * 
 * Ce module gère l'ouverture d'URLs externes de manière compatible
 * avec tous les environnements (iOS natif, Android natif, Web).
 * 
 * Sur iOS natif, window.open() ne fonctionne pas correctement pour
 * les URLs externes comme Stripe Checkout. Ce module utilise le
 * plugin Capacitor Browser pour résoudre ce problème.
 */

import { Capacitor } from "@capacitor/core";

/**
 * Vérifie si l'application tourne dans un environnement natif (iOS/Android)
 */
export const isNativePlatform = (): boolean => {
  return Capacitor.isNativePlatform();
};

/**
 * Vérifie si l'application tourne sur iOS natif
 */
export const isIOSNative = (): boolean => {
  return Capacitor.getPlatform() === 'ios';
};

/**
 * Vérifie si l'application tourne sur Android natif
 */
export const isAndroidNative = (): boolean => {
  return Capacitor.getPlatform() === 'android';
};

/**
 * Ouvre une URL externe de manière compatible avec toutes les plateformes
 * 
 * Sur iOS natif: Utilise le plugin Capacitor Browser (in-app browser)
 * Sur Android natif: Utilise le plugin Capacitor Browser
 * Sur Web: Utilise window.open() standard
 * 
 * @param url - L'URL à ouvrir
 * @param options - Options d'ouverture
 * @returns Promise<void>
 * 
 * @example
 * // Ouvrir Stripe Checkout
 * await openExternalUrl('https://checkout.stripe.com/pay/cs_xxx');
 * 
 * @example
 * // Ouvrir dans un nouvel onglet (web uniquement)
 * await openExternalUrl('https://example.com', { newTab: true });
 */
export const openExternalUrl = async (
  url: string, 
  options: { newTab?: boolean } = {}
): Promise<void> => {
  if (!url) {
    console.error('[browserUtils] URL is required');
    return;
  }

  try {
    if (isNativePlatform()) {
      // Sur iOS/Android, utiliser le plugin Capacitor Browser
      const { Browser } = await import("@capacitor/browser");
      
      await Browser.open({ 
        url,
        // Sur iOS, utiliser le navigateur in-app pour Stripe
        // Cela permet de revenir à l'app après le paiement
        presentationStyle: 'popover',
        // Couleur de la toolbar (optionnel)
        toolbarColor: '#9b86f3',
      });
      
      console.log('[browserUtils] Opened URL in native browser:', url);
    } else {
      // Sur Web, utiliser window.open standard
      const target = options.newTab ? '_blank' : '_self';
      window.open(url, target);
      console.log('[browserUtils] Opened URL in web browser:', url);
    }
  } catch (error) {
    console.error('[browserUtils] Error opening URL:', error);
    
    // Fallback: essayer window.open si le plugin échoue
    try {
      window.open(url, '_blank');
    } catch (fallbackError) {
      console.error('[browserUtils] Fallback also failed:', fallbackError);
      // En dernier recours, rediriger la page actuelle
      window.location.href = url;
    }
  }
};

/**
 * Ouvre une URL Stripe Checkout de manière optimisée pour les paiements
 * 
 * Cette fonction est spécifiquement conçue pour les URLs Stripe Checkout
 * et gère les particularités de chaque plateforme pour assurer un
 * flux de paiement fluide.
 * 
 * @param checkoutUrl - L'URL Stripe Checkout
 * @returns Promise<void>
 */
export const openStripeCheckout = async (checkoutUrl: string): Promise<void> => {
  if (!checkoutUrl) {
    console.error('[browserUtils] Stripe checkout URL is required');
    return;
  }

  console.log('[browserUtils] Opening Stripe checkout:', checkoutUrl);

  if (isNativePlatform()) {
    try {
      const { Browser } = await import("@capacitor/browser");
      
      // Configuration optimisée pour Stripe sur iOS/Android
      await Browser.open({
        url: checkoutUrl,
        presentationStyle: 'fullscreen', // Plein écran pour le paiement
        toolbarColor: '#9b86f3',
      });

      // Écouter la fermeture du navigateur (retour à l'app)
      Browser.addListener('browserFinished', () => {
        console.log('[browserUtils] Browser closed, user returned to app');
        // Le webhook Stripe gèrera la confirmation du paiement
      });

    } catch (error) {
      console.error('[browserUtils] Error opening Stripe checkout:', error);
      // Fallback: redirection directe
      window.location.href = checkoutUrl;
    }
  } else {
    // Sur Web, ouvrir dans un nouvel onglet pour ne pas perdre le panier
    window.open(checkoutUrl, '_blank');
  }
};

/**
 * Ferme le navigateur in-app (iOS/Android uniquement)
 * Utile après un paiement réussi pour revenir à l'app
 */
export const closeInAppBrowser = async (): Promise<void> => {
  if (isNativePlatform()) {
    try {
      const { Browser } = await import("@capacitor/browser");
      await Browser.close();
      console.log('[browserUtils] In-app browser closed');
    } catch (error) {
      console.error('[browserUtils] Error closing browser:', error);
    }
  }
};
