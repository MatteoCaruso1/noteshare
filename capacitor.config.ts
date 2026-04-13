import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.noteshare.app',
  appName: 'Noteshare',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      backgroundColor: '#141b2d',
      launchShowDuration: 2000,
      launchAutoHide: true,
      launchFadeOutDuration: 300,
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
      splashImmersive: true,
    },
    StatusBar: {
      // Light content (white text/icons) on dark background
      style: 'DARK',        // DARK = light text on dark bg
      backgroundColor: '#141b2d',
      overlaysWebView: true, // Content extends under status bar (viewport-fit=cover)
    },
  },
};

export default config;
