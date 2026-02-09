
# Complete Rewrite: Google Login/Signup

## Root Cause Analysis

The current implementation has a **redirect loop** caused by:
1. Multiple OAuth initiation paths competing (library vs manual redirect)
2. An intermediate redirect page (`OAuthInitiateRedirect.tsx`) that gets stuck
3. Service worker caching old routes
4. The `@lovable.dev/cloud-auth-js` library potentially overriding navigation

## Solution: Strip to Ground Zero and Rebuild

### Core Principle
**One path, no intermediaries, no library dependency for initiation.**

The new flow will be:
```text
User clicks "Log in with Google"
        ↓
Browser navigates DIRECTLY to broker:
https://jazz-scene-alive.lovable.app/~oauth/initiate?provider=google&redirect_uri=...
        ↓
Google auth happens
        ↓
Broker redirects back to: notesharemusic.com/auth#access_token=...
        ↓
Auth.tsx parses tokens from hash, sets session, redirects to /
```

---

## Implementation Plan

### Phase 1: Create a Centralized OAuth Helper

Create `src/lib/oauth.ts` - a single source of truth for OAuth:

- Define the broker URL constant: `https://jazz-scene-alive.lovable.app/~oauth/initiate`
- Export a `startGoogleOAuth()` function that:
  - Builds the complete broker URL with provider + redirect_uri
  - Uses `window.location.href = url` (not assign, not replace - direct assignment)
- Export a `parseOAuthCallback()` function that:
  - Checks if the current URL has OAuth tokens in hash
  - Returns `{ accessToken, refreshToken } | null`

### Phase 2: Rewrite Auth.tsx Google Handler

Replace `handleGoogleAuth` with:
- Import and call `startGoogleOAuth()` from the new helper
- Remove all references to the lovable auth library for Google
- The `redirect_uri` should be exactly `${window.location.origin}/auth`

### Phase 3: Rewrite Auth.tsx Callback Handler

Simplify the token parsing in `useEffect`:
- Use `parseOAuthCallback()` helper
- If tokens found:
  - Call `supabase.auth.setSession({ access_token, refresh_token })`
  - On success: clear URL hash, set remember-me flag, navigate to `/`
  - On failure: show clear error message
- Remove convoluted logic branches

### Phase 4: Remove the Redirect Page

Delete `src/pages/OAuthInitiateRedirect.tsx` completely.

The intermediate redirect page is the source of the loop. If the app is well-configured, users should never hit `/~oauth/initiate` on the custom domain - they should go straight to the broker.

### Phase 5: Update Routing in App.tsx

Remove the OAuth routes entirely:
- Delete `<Route path="/~oauth/initiate/*" ...`
- Delete `<Route path="/~oauth/*" ...`

If a user somehow lands on `/~oauth/*`, it will 404 - which is correct. The Google button will NEVER send them there.

### Phase 6: Clean Up useAuth.tsx

Remove the unused `signInWithGoogle` function that uses the lovable library, since we're now doing direct browser redirects in Auth.tsx.

---

## Technical Details

### New file: `src/lib/oauth.ts`
```typescript
const OAUTH_BROKER_URL = "https://jazz-scene-alive.lovable.app/~oauth/initiate";

export function startGoogleOAuth() {
  const redirectUri = `${window.location.origin}/auth`;
  const url = `${OAUTH_BROKER_URL}?provider=google&redirect_uri=${encodeURIComponent(redirectUri)}`;
  
  // Direct assignment - simplest, most reliable cross-browser
  window.location.href = url;
}

export function parseOAuthCallback(): { accessToken: string; refreshToken: string } | null {
  const hash = window.location.hash;
  if (!hash) return null;
  
  const params = new URLSearchParams(hash.substring(1));
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  
  if (!accessToken) return null;
  return { accessToken, refreshToken: refreshToken || "" };
}
```

### Modified: `src/pages/Auth.tsx`
- Import `startGoogleOAuth`, `parseOAuthCallback` from `@/lib/oauth`
- `handleGoogleAuth` becomes: `startGoogleOAuth()`
- Callback handling uses `parseOAuthCallback()`

### Deleted files:
- `src/pages/OAuthInitiateRedirect.tsx`

### Modified: `src/App.tsx`
- Remove import of `OAuthInitiateRedirect`
- Remove the two `/~oauth` routes

### Modified: `src/hooks/useAuth.tsx`
- Remove `signInWithGoogle` function (unused after rewrite)
- Remove import of `lovable` from integrations

---

## Files Changed Summary

| File | Action |
|------|--------|
| `src/lib/oauth.ts` | CREATE - OAuth helper functions |
| `src/pages/Auth.tsx` | REWRITE - Google auth initiation + callback |
| `src/pages/OAuthInitiateRedirect.tsx` | DELETE |
| `src/App.tsx` | MODIFY - Remove OAuth routes |
| `src/hooks/useAuth.tsx` | MODIFY - Remove unused signInWithGoogle |

---

## Why This Will Work

1. **No intermediate page** - Eliminates the redirect loop entirely
2. **No library dependency** - Direct browser navigation to a known-good URL
3. **Single code path** - One way in, one way out
4. **Robust callback parsing** - Clear token extraction with error handling
5. **Works on all domains** - Custom domain, preview, published - all use the same broker URL

---

## Testing Checklist (After Implementation)

1. On `notesharemusic.com`: Click "Log in with Google" → Complete Google auth → Land on `/` signed in
2. On `jazz-scene-alive.lovable.app`: Same flow works
3. On preview URL: Same flow works  
4. New user via Google: Profile created, onboarding triggered
5. Existing user via Google: Signs in without duplicate profile
6. Safari/iOS: No login loops, session persists
