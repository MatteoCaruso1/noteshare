// OAuth Helper - Single source of truth for Google OAuth
// This bypasses all library dependencies and uses direct browser navigation.
// On native iOS/Android, it opens SFSafariViewController / Chrome Custom Tabs
// via @capacitor/browser to avoid WKWebView cookie/redirect issues.

const OAUTH_BROKER_URL = "https://jazz-scene-alive.lovable.app/~oauth/initiate";

/**
 * Detect if running inside a native Capacitor shell.
 */
function isNativePlatform(): boolean {
  const cap = (window as any).Capacitor;
  if (typeof cap === 'undefined') return false;
  return (
    cap.getPlatform?.() !== 'web' ||
    cap.isNativePlatform?.() === true ||
    document.URL.startsWith('capacitor://')
  );
}

/**
 * Start Google OAuth flow.
 * - Web: standard redirect via window.location.href
 * - Native: opens SFSafariViewController via @capacitor/browser
 *   (avoids WKWebView restrictions on third-party cookies and redirects)
 */
export async function startGoogleOAuth(): Promise<void> {
  // Always redirect back to /auth to handle the callback
  const redirectUri = `${window.location.origin}/auth`;
  
  // Build the broker URL with required parameters
  const brokerUrl = `${OAUTH_BROKER_URL}?provider=google&redirect_uri=${encodeURIComponent(redirectUri)}`;
  
  console.log('[OAuth] Starting Google OAuth');
  console.log('[OAuth] Redirect URI:', redirectUri);
  console.log('[OAuth] Native:', isNativePlatform());

  if (isNativePlatform()) {
    try {
      // Dynamic import — only loads @capacitor/browser on native
      const { Browser } = await import('@capacitor/browser');
      await Browser.open({
        url: brokerUrl,
        presentationStyle: 'popover', // SFSafariViewController on iOS
        windowName: '_self',
      });
      // The browser will redirect back to the app via the Universal Link / App URL scheme.
      // The callback is handled by the /auth route when the WebView receives the redirect.
      return;
    } catch (err) {
      console.warn('[OAuth] Capacitor Browser failed, falling back to redirect:', err);
      // Fall through to standard redirect
    }
  }
  
  // Web: direct assignment - simplest, most reliable cross-browser method
  window.location.href = brokerUrl;
}

/**
 * Parse OAuth callback tokens from the URL hash.
 * Returns tokens if found, null otherwise.
 */
export function parseOAuthCallback(): { accessToken: string; refreshToken: string } | null {
  const hash = window.location.hash;
  
  // No hash means no OAuth callback
  if (!hash || hash.length <= 1) {
    return null;
  }
  
  // Parse the hash fragment (remove leading #)
  const params = new URLSearchParams(hash.substring(1));
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  
  // No access token means not an OAuth callback
  if (!accessToken) {
    return null;
  }
  
  console.log('[OAuth] Parsed callback tokens - has access_token:', !!accessToken, 'has refresh_token:', !!refreshToken);

  // On native, close the in-app browser if it's still open
  if (isNativePlatform()) {
    import('@capacitor/browser').then(({ Browser }) => {
      Browser.close().catch(() => void 0);
    }).catch(() => void 0);
  }

  return {
    accessToken,
    refreshToken: refreshToken || "",
  };
}

/**
 * Check if the current URL contains OAuth callback tokens.
 * Useful for conditional logic before parsing.
 */
export function isOAuthCallback(): boolean {
  const hash = window.location.hash;
  return hash.includes('access_token');
}

/**
 * Clear OAuth tokens from the URL hash for cleaner appearance.
 */
export function clearOAuthHash(): void {
  window.history.replaceState(null, '', window.location.pathname + window.location.search);
}
