import { Capacitor } from '@capacitor/core';

/**
 * Returns true when running inside the native iOS app (WKWebView via Capacitor).
 * Stripe purchase UI must be hidden in this context to comply with App Store rules.
 */
export function isNativeIOS(): boolean {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';
}

/**
 * Returns true when running on any native platform (iOS or Android).
 */
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Returns true when running in a web browser (not native).
 */
export function isWeb(): boolean {
  return !Capacitor.isNativePlatform();
}
