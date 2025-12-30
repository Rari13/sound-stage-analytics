import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.sparkevents.app',
  appName: 'Spark Events',
  webDir: 'dist',
  server: {
    // Pour le développement, décommentez la ligne ci-dessous pour hot-reload
    // url: 'https://f6d30a56-2b5b-47c5-8e2c-a28853d84376.lovableproject.com?forceHideBadge=true',
    // cleartext: true,
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
