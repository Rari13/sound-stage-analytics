import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.f6d30a562b5b47c58e2ca28853d84376',
  appName: 'Spark Events',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // Important: Allow navigation to Stripe checkout URLs
    allowNavigation: [
      'checkout.stripe.com',
      '*.stripe.com',
      'spark-events-analytics.vercel.app'
    ]
  },
  plugins: {
    Keyboard: {
      resize: 'body',
      style: 'dark',
      resizeOnFullScreen: true,
    },
    // Configuration du scanner de code-barres pour iOS
    BarcodeScanner: {
      // Demander la permission au démarrage
      requestPermissionOnFirstCall: true,
    },
  },
  // Configuration iOS spécifique
  ios: {
    // Permettre le scroll inertiel natif
    scrollEnabled: true,
    // Schéma HTTPS pour les requêtes
    scheme: 'https',
    // Permettre les liens externes
    allowsLinkPreview: true,
  }
};

export default config;
