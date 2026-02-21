

## Problem Analysis

There are two related issues happening:

1. **Unexpected page reload**: The service worker (SW) auto-update strategy in `main.tsx` forces a `window.location.reload()` whenever a new SW version takes control. This can happen at any time, including while the user is actively on the practice page.

2. **Waveform shows "error" after reload**: After the SW-triggered reload, the auth state takes a moment to initialize. The `useSignedUrl` hook calls the backend to sign the audio URL, but the auth token isn't ready yet. On auth failure, the hook **falls back to the unsigned original URL** (`setSignedUrl(originalUrl)` on line 248 of `useSignedUrl.ts`). WaveSurfer then tries to load this unsigned URL, gets a 403, and enters the error state permanently -- there is no recovery path.

## Root Cause

In `useSignedUrl.ts`, when the edge function call fails with an auth error after 3 retries (1.5s total), the hook gives up and sets `signedUrl` to the raw, unsigned storage path. This path is not loadable, so WaveSurfer fails and shows the error UI. Post-SW-reload, auth can take longer than 1.5s to propagate, so the retry window is too short.

## Fix Plan

### 1. Fix `useSignedUrl.ts` -- Don't fall back to unusable URLs on auth errors

- When an auth error occurs and retries are exhausted, do NOT set `signedUrl` to the original unsigned URL (which will always fail to load).
- Instead, keep `signedUrl` as `null` and increase the retry window: bump max retries from 3 to 5 and delay from 500ms to 1000ms. This gives ~5 seconds for auth to stabilize after a reload.
- Only fall back to `originalUrl` for non-auth errors (e.g., the URL is genuinely broken).

### 2. Fix `WaveformPlayer.tsx` -- Add error recovery on signedUrl change

- When `signedUrl` changes (e.g., auth eventually succeeds and a valid URL arrives), the existing `useEffect` already re-initializes WaveSurfer. But if `error` was set to `true`, the component renders the fallback `<audio>` element and never re-tries the waveform.
- Add: when `signedUrl` changes, reset the `error` state to `false` so the waveform gets another chance to load.

### 3. Suppress disruptive SW reloads in `main.tsx`

- Prevent `window.location.reload()` from firing while the user is actively on the page (i.e., `document.visibilityState === 'visible'`).
- Instead, defer the reload until the next time the page becomes hidden (user switches tabs or locks phone) and then visible again. This avoids jarring mid-use reloads while still ensuring users get updates promptly.

## Technical Details

### `src/hooks/useSignedUrl.ts`
- Change retry count from 3 to 5 and delay from 500ms to 1000ms
- On auth error after all retries exhausted: set `signedUrl(null)` instead of `signedUrl(originalUrl)`

### `src/components/WaveformPlayer.tsx`
- Add a `useEffect` that resets `error` to `false` when `signedUrl` changes, giving the waveform a fresh chance to load

### `src/main.tsx`
- In the `controllerchange` listener, check `document.visibilityState`. If `'visible'`, defer reload to next `visibilitychange` event (hidden then visible) rather than reloading immediately mid-session

