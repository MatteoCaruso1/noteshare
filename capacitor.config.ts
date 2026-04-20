import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.noteshare.app',
  appName: 'Noteshare',
  webDir: 'dist',
  // Android-specific platform settings
  android: {
    // Disallow http content inside the WebView for security
    allowMixedContent: false,
    // Disable Chrome DevTools attachment in production builds
    webContentsDebuggingEnabled: false,
    // Android 12+ splash screen integration is handled by the SplashScreen plugin below
    captureInput: true,
  },
  // iOS-specific platform settings (kept as-is)
  ios: {
    contentInset: 'always',
  },
  plugins: {
    SplashScreen: {
      backgroundColor: '#141b2d',
      launchShowDuration: 2000,
      launchAutoHide: true,
      launchFadeOutDuration: 300,
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
      splashImmersive: true,
      // Android 12+ splash uses these specifically
      androidSplashResourceName: 'splash',
    },
    StatusBar: {
      // Light content (white text/icons) on dark background
      // Note: 'DARK' style on iOS = light text on dark bg.
      // On Android, the @capacitor/status-bar plugin treats 'DARK' the same way (light icons).
      style: 'DARK',
      backgroundColor: '#141b2d',
      overlaysWebView: true, // Content extends under status bar (viewport-fit=cover)
    },
  },
};

export default config;
