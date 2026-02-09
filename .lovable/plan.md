
## Goal
Make “Log in with Google / Sign up with Google” work reliably across:
- Preview domain (`*.lovableproject.com`)
- Published domain (`*.lovable.app`)
- Custom domain (`notesharemusic.com`)
- Browsers with stricter storage/cookie behavior (Safari/iOS)

The screenshot indicates users are landing on:
`https://notesharemusic.com/~oauth/initiate?...` and getting a 404.
That URL should never be a dead-end. If it’s hit, we must successfully forward to the OAuth broker and then back to `/auth` to finish login.

---

## What’s likely happening (based on code + screenshot)
You currently have:
- A redirect page at `src/pages/OAuthInitiateRedirect.tsx` that forwards `/<~oauth/initiate>` to the broker:
  `https://jazz-scene-alive.lovable.app/~oauth/initiate`
- A route registered: `Route path="/~oauth/initiate" ...`

Yet the user is still seeing a 404 at `/~oauth/initiate`.

The two most probable causes:
1) **Route mismatch edge case**  
   React Router may not be matching `"/~oauth/initiate"` in some situations (trailing slash, extra segments, encoded path, etc.). If the path is `"/~oauth/initiate/"` or `"/~oauth/initiate/something"`, it will fall through to `*` and show NotFound.

2) **The OAuth library path is still being used in some builds/contexts**  
   Even though `createLovableAuth` is configured with an absolute broker URL, the screenshot shows the app still navigating to a same-origin `"/~oauth/initiate"` URL. We should treat that as an unreliable link and make the app resilient by:
   - Ensuring `"/~oauth/initiate"` always redirects (route wildcard)
   - Ensuring the Google button itself always starts OAuth via the broker (manual start)

---

## Implementation plan (robust + “rewrite” approach)

### Phase 1 — Make `"/~oauth/initiate"` unbreakable (routing hardening)
1. Update routing in `src/App.tsx`:
   - Change the route from:
     - `path="/~oauth/initiate"`
   - To:
     - `path="/~oauth/initiate/*"`
   This catches any trailing slash or unexpected extra path segments and still loads the redirect component.

2. Optionally add a broader catch-all for `~oauth` (only if needed after testing):
   - `path="/~oauth/*"` → also renders `OAuthInitiateRedirect`
   This is a belt-and-suspenders approach if we discover other broker-related subpaths appear.

3. Improve `OAuthInitiateRedirect.tsx` UX + resiliency:
   - Render a simple “Redirecting to Google…” loading state (instead of blank).
   - Preserve *both* `search` and `hash` just in case:
     - Forward `window.location.search` and `window.location.hash` to the broker.
   - Use `window.location.assign` (or `replace`, whichever you prefer). `replace` prevents polluting back history; `assign` is sometimes easier for debugging. We’ll pick based on your preference.

**Expected result:** any visit to `https://<any-domain>/~oauth/initiate...` immediately forwards to the broker and no longer shows a 404.

---

### Phase 2 — Fully rewrite the “Google login” button to start OAuth directly via the broker (no library dependency)
In `src/pages/Auth.tsx`, replace the current `handleGoogleAuth` flow with a deterministic redirect:
1. Define a single source-of-truth broker URL (same value you used in `OAuthInitiateRedirect.tsx`):
   - `const OAUTH_BROKER_URL = "https://jazz-scene-alive.lovable.app/~oauth/initiate";`

2. On click:
   - Compute `redirect_uri = ${window.location.origin}/auth`
   - Build the broker initiation URL:
     - `${OAUTH_BROKER_URL}?provider=google&redirect_uri=${encodeURIComponent(redirect_uri)}`
   - Then do: `window.location.assign(initUrl)`

3. Keep the existing `/auth` callback handler:
   - You already parse tokens from the URL hash and call `supabase.auth.setSession(...)` as a fallback.
   - That’s good; we’ll keep it, but we’ll tighten it so it:
     - Clears the URL hash after successful session set
     - Shows a better error if tokens are present but session fails
     - Avoids interfering with password recovery (you already handle that)

**Expected result:** clicking “Log in with Google” never hits `notesharemusic.com/~oauth/initiate` in the first place; it goes straight to the broker every time.

---

### Phase 3 — Add lightweight diagnostics (so we don’t guess next time)
Add structured console logging in `Auth.tsx` and `OAuthInitiateRedirect.tsx` (temporary but very helpful):
- When starting OAuth:
  - log the computed `redirect_uri`
  - log the final broker URL (without leaking secrets; this URL doesn’t contain secrets)
- When arriving at `/auth`:
  - log whether `access_token` exists, whether `error` exists, and which `type` it is
- In `OAuthInitiateRedirect`:
  - log `window.location.href` before redirecting

This will let us confirm:
- Are users starting OAuth on the right URL?
- Are we returning to `/auth` with tokens?
- Are we failing at session set, or never receiving tokens?

(If you prefer, we can hide these logs behind a query param like `?debugAuth=1`.)

---

### Phase 4 — End-to-end verification matrix (critical)
We’ll verify on each environment:
1. Preview URL (`*.lovableproject.com`)
2. Published URL (`*.lovable.app`)
3. Custom domain (`notesharemusic.com`)

Test cases:
- Existing user: Google login → lands at `/` authenticated
- New user: Google signup → lands at `/` authenticated and onboarding triggers once
- “Direct hit” regression test:
  - Manually paste: `/<custom-domain>/~oauth/initiate?provider=google&redirect_uri=<...>`
  - Confirm it redirects away (no 404)
- Safari/iOS (if you have access):
  - Ensure no login loop, and that “Stay logged in” expectations are met

---

## Files we’ll modify (no backend schema changes)
- `src/App.tsx`
  - Harden route matching with `"/~oauth/initiate/*"` (and optionally `"/~oauth/*"` if needed)
- `src/pages/Auth.tsx`
  - Rewrite Google auth initiation to use a direct broker redirect
  - Keep/improve callback token parsing and error handling
- `src/pages/OAuthInitiateRedirect.tsx`
  - Preserve query/hash and show a small redirecting UI
  - (Optional) add debug logging

---

## Risk / tradeoffs
- This approach intentionally bypasses the OAuth helper library for initiation. That’s acceptable here because:
  - The broker URL is known and stable
  - We only need Google
  - It removes uncertainty about which domain/path the library chooses in edge cases
- If the broker URL ever changes, we’ll update it in one place (we can also centralize it into a tiny `src/lib/auth/oauth.ts` helper after this is stable).

---

## Clarifying questions (only if needed to finalize the implementation)
If you can confirm these, it will help choose the safest routing strategy:
1) When you reproduced the issue, were you on the custom domain (`notesharemusic.com`) or in the Preview environment?
2) After clicking Google login, does it open in the same tab or a popup/new tab?
3) Do you want the browser Back button to return to `/auth` after a failed attempt (favor `assign`) or avoid adding a history entry (favor `replace`)?

(We can proceed without answers, but these influence polish and edge-case behavior.)
