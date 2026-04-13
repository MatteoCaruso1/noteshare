import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.noteshare.app',
  appName: 'Noteshare',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      // Match dark theme --background: 222 47% 11% → #141b2d
      backgroundColor: '#141b2d',
      launchShowDuration: 2000,
      launchAutoHide: true,
      launchFadeOutDuration: 300,
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
      splashImmersive: true,
    },
  },
};

export default config;
