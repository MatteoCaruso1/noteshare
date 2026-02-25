

# Fix: Stale Content After Hard Refresh (PWA Caching)

## Problem
After a hard refresh (Ctrl+Shift+R), users still see outdated versions of the app (e.g., missing the report flag icon on profiles). This happens because the service worker intercepts requests before the browser cache and serves stale precached JavaScript bundles.

## Root Cause
Two issues in the current PWA setup:

1. **Workbox precache serves old bundles**: The `globPatterns` config caches all JS/CSS/HTML. Even hard refresh doesn't bypass the service worker's cache -- it only bypasses the browser's HTTP cache.

2. **Deferred reload on controller change**: When a new service worker takes control, the reload is deferred until the user leaves the tab and comes back. If they stay on the page, they run old code forever.

## Solution

### Change 1: Add `skipWaiting` to the Workbox config (vite.config.ts)

Add `skipWaiting: true` and `clientsClaim: true` to the Workbox configuration. This tells the new service worker to activate immediately upon installation instead of waiting.

```
workbox: {
  skipWaiting: true,
  clientsClaim: true,
  globPatterns: [...]
  ...
}
```

### Change 2: Reload immediately on controller change (main.tsx)

Remove the deferred visibility-based reload logic. When a new service worker takes control, reload immediately so the user gets fresh assets. The `skipWaiting` + `clientsClaim` combo ensures this only happens once per deployment, and the reload is near-instant since the new assets are already precached.

Replace the `controllerchange` listener with a simple immediate reload:

```typescript
navigator.serviceWorker.addEventListener("controllerchange", () => {
  if (refreshing) return;
  refreshing = true;
  window.location.reload();
});
```

### Change 3: Simplify SW registration (main.tsx)

Since `skipWaiting` is now handled by Workbox in the SW itself, remove the manual `postMessage({ type: "SKIP_WAITING" })` calls from main.tsx -- they're redundant.

## Why This Works
- `skipWaiting: true` makes new service workers activate instantly (no waiting for old tabs to close)
- `clientsClaim: true` makes the new SW take over existing pages immediately
- Immediate reload on `controllerchange` ensures users get fresh code right away
- Hard refresh will now work as expected because the SW updates on the spot

## Trade-off
Users may see a single quick page reload after a new deployment while they're actively using the app. This is a much better UX than serving stale code indefinitely.

