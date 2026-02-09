// OAuth Helper - Single source of truth for Google OAuth
// This bypasses all library dependencies and uses direct browser navigation

const OAUTH_BROKER_URL = "https://jazz-scene-alive.lovable.app/~oauth/initiate";

/**
 * Start Google OAuth flow by navigating directly to the OAuth broker.
 * This is the most reliable cross-browser method - no libraries, no intermediaries.
 */
export function startGoogleOAuth(): void {
  // Always redirect back to /auth to handle the callback
  const redirectUri = `${window.location.origin}/auth`;
  
  // Build the broker URL with required parameters
  const brokerUrl = `${OAUTH_BROKER_URL}?provider=google&redirect_uri=${encodeURIComponent(redirectUri)}`;
  
  console.log('[OAuth] Starting Google OAuth');
  console.log('[OAuth] Redirect URI:', redirectUri);
  console.log('[OAuth] Broker URL:', brokerUrl);
  
  // Direct assignment - simplest, most reliable cross-browser method
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
