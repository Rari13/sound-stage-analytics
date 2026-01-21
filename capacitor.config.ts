import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.f6d30a562b5b47c58e2ca28853d84376',
  appName: 'Spark Events',
  webDir: 'dist',
  server: {
    // Hot-reload activé pour le développement
    url: 'https://f6d30a56-2b5b-47c5-8e2c-a28853d84376.lovableproject.com?forceHideBadge=true',
    cleartext: true,
    androidScheme: 'https'
  },
  plugins: {
    Keyboard: {
      resize: 'body',
      style: 'dark',
      resizeOnFullScreen: true,
    },
  }
};

export default config;
