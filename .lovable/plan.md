# Why your changes aren't reaching the PWA

This is almost certainly **not** a Lovable publishing problem. Frontend publishes typically propagate within 1–2 minutes after you click "Update" in the publish dialog. The symptoms you're describing — "none hit my mobile PWA, only some hit web" — match a **service worker caching** issue, which is local to each device/browser.

## What's actually happening

Your app registers a service worker (`/sw.js`) configured in `vite.config.ts`:

- `registerType: "autoUpdate"` + `clientsClaim: true`
- `skipWaiting` is intentionally **disabled** (per `mem://architecture/pwa-implementation`) to protect active practice sessions
- A new SW version becomes "waiting" and only activates when the user taps **"Update now"** in the toast (`UpdateAvailableToast.tsx`) or fully closes/reopens the app

**Two things compound on the installed PWA:**

1. **The "Update now" toast only appears if the tab is open when the SW detects the update.** If you open the installed PWA after a deploy, the new SW installs in the background but the previous controller keeps serving cached HTML/JS. You need a second cold launch (or the toast tap) for the new version to actually take effect.
2. **iOS PWAs (Add to Home Screen) are even worse** — WKWebView aggressively suspends and caches. It can take multiple full closes (swipe up from app switcher) before the new SW activates. Pull-to-refresh inside the PWA does **not** clear the SW.
3. **Web (regular browser tabs):** if you had the tab already open during multiple deploys, you're seeing whichever cached version your SW happens to have promoted. New incognito tabs would show the latest.

## What to check first (no code changes)

1. On your phone PWA: fully **close it from the app switcher**, wait a few seconds, reopen. Do this **twice**. The "Update now" toast should appear on the second open — tap it.
2. On web: open `https://notesharemusic.com` in a **fresh incognito window**. If that shows the latest changes, publishing worked fine — it's purely SW cache lag on your other devices.
3. Check the Lovable publish dialog history to confirm each publish actually completed (vs. you closed the dialog before "Update" finished).

If incognito shows the latest changes → publishing is fine, the rest of this plan addresses making updates reach users faster.

# Proposed code changes

The current "deferred update" strategy was designed to protect users mid-practice-session, but it makes updates feel broken because:
- Most opens of the PWA aren't mid-session
- The toast requires the tab to be open during the update-found event, which is rare on a PWA that's launched fresh
- iOS especially needs more aggressive SW lifecycle handling

## 1. Auto-activate updates on cold launch (when no session is active)

In `src/main.tsx`, when a new SW is detected via `updatefound`:
- If the app was **just launched** (no `sessionStorage` flag indicating an active practice session), call `newWorker.postMessage({ type: 'SKIP_WAITING' })` immediately and reload once activated.
- If a practice session **is** active, fall back to the current toast behavior.

Detect "active session" by checking the existing `PracticeTimerContext` persistence key (e.g. `noteshare_active_session` in localStorage). This preserves the session-protection guarantee while making cold launches always show the latest version.

## 2. Listen for `controllerchange` and reload once

Add a `navigator.serviceWorker.addEventListener('controllerchange', ...)` handler in `main.tsx` that reloads the page **once** (guarded by a flag to prevent reload loops). This ensures that when the new SW takes control, the user actually sees the new assets.

## 3. Check for updates on `visibilitychange`

Currently `registration.update()` runs on load and hourly. Add a `document.addEventListener('visibilitychange', ...)` call that re-runs `registration.update()` when the PWA returns to the foreground. This catches the common case where users leave the PWA backgrounded for hours/days.

## 4. Surface a "Force update" affordance

Add a small "Check for updates" button somewhere in Profile/Settings that:
- Calls `registration.update()`
- If a `waiting` worker exists, posts `SKIP_WAITING` and reloads
- Otherwise toasts "You're on the latest version"

Gives you (and any stuck user) an explicit escape hatch without needing to clear browser data.

## 5. Bump cache busting on the SW itself

The current Workbox config uses content-hashed precache, which is correct. No change needed here — but I'll verify nothing is being served `Cache-Control: immutable` for `index.html` or `sw.js`. If you have any custom headers, those need `no-cache` for the SW + HTML shell.

# Files to edit

- `src/main.tsx` — smarter update flow (skipWaiting on cold launch, controllerchange reload, visibilitychange refresh)
- `src/components/UpdateAvailableToast.tsx` — keep as fallback for active-session case
- `src/pages/Profile.tsx` (or a small new component) — "Check for updates" button

# What this won't fix

- The **first** time after this change ships, your existing installed PWA still has the old SW and old logic, so it'll need one more manual update (toast tap or 2x cold launch) to pick up the new behavior. After that, future updates land automatically on cold launch.
- iOS PWA SW activation is still ultimately at WKWebView's mercy — but with `controllerchange` + `visibilitychange` checks, it'll be dramatically more reliable.

# Recommended next step

Approve this plan and I'll implement changes 1–4. Before I do, can you confirm in a fresh **incognito browser window** at `https://notesharemusic.com` that your latest changes **are** live? That confirms publishing itself is working and the issue is purely client-side SW caching, which is what the plan addresses.