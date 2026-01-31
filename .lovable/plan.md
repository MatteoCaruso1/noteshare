
## What we should do now (given it’s broken on load)

Since scrolling is **completely locked even on a fresh reload** (desktop) and only internal popups can scroll, we’re no longer dealing with a “one-off close animation” bug. We need to switch from guessing to **instrumented diagnosis** so we can see the *exact* state of the document when scroll is broken.

The fastest path is:

1) add a small in-app “Scroll Debug / Force Unlock” overlay (gated behind a URL flag so normal users never see it),
2) update our scroll-lock recovery to detect *style-based locks* (not just `data-scroll-locked` / `overflow-hidden`),
3) use the debug overlay to identify what’s applying the lock on load, then fix the specific offender.

---

## Why the current recovery system can miss this

Right now, `ScrollToTop.tsx`’s MutationObserver only treats scroll as “locked” when it sees:

- `data-scroll-locked` attribute, or
- `overflow-hidden` class

But real-world stuck states also happen when something leaves behind **inline styles** like:

- `body.style.overflow = 'hidden'` (or `overflowY = 'hidden'`)
- `body.style.position = 'fixed'` + `top = -123px` (common scroll-lock technique)
- `body.style.pointerEvents = 'none'` (this can make the page feel “dead” even if overflow is fine)

We already *clear* these fields in `clearScrollLocks()`, but we often **don’t detect** that we need to run it because the observer’s `hasScrollLock` check ignores inline style states.

Also, since you report “broken on load”, something may be applying a lock after the initial mount cleanup runs.

---

## Implementation plan

### 1) Add a hidden “Scroll Lock Debugger” overlay
**Goal:** make the app tell us exactly why scrolling is locked, without requiring DevTools or screen recordings.

- Create a lightweight debug component (e.g. `ScrollLockDebugger.tsx`) rendered only when:
  - `location.search` contains `debugScroll=1`, or
  - a `localStorage` flag is set (optional)
- Display live values (updated every ~250ms):
  - `document.body.style.overflow`, `overflowY`, `position`, `top`, `paddingRight`, `pointerEvents`
  - `document.body.getAttribute('data-scroll-locked')`
  - `document.body.classList.contains('overflow-hidden')`
  - same for `document.documentElement` (html)
  - `window.innerHeight`, `document.documentElement.scrollHeight`, `window.scrollY`
  - `isAnyOverlayOpen()` result (from `src/lib/scrollLock.ts`)
  - counts of matching overlay nodes:
    - `[role="dialog"][data-state="open"]`
    - `[data-radix-dialog-overlay]`
    - `[data-vaul-drawer]`
- Include buttons:
  - **Force unlock scroll** → calls `clearDocumentScrollLocks()`
  - **Log snapshot** → `console.log()` the snapshot for copy/paste

This gives us immediate clarity whether the lock is:
- a stuck Radix lock attribute/class,
- a stuck inline style lock,
- or something else (like the page simply not having scrollable height).

### 2) Strengthen the global recovery logic (fix detection, not just clearing)
Update `src/components/ScrollToTop.tsx` to:

- Import and reuse the shared utilities from `src/lib/scrollLock.ts` (so we don’t maintain two separate “unlock” implementations).
- Expand the “hasScrollLock” detection to include inline style locks, e.g.:
  - `document.body.style.overflow === 'hidden'`
  - `document.documentElement.style.overflow === 'hidden'`
  - `document.body.style.position === 'fixed'`
  - `document.body.style.pointerEvents === 'none'`
- Only auto-clear when **no overlay is actually open** (using `isAnyOverlayOpen()`).
- Add `document.documentElement` style to the observer attributeFilter too (currently we observe html attributes but not `style` changes on html).

This should address the “broken on load” scenario where a library applies a style lock without setting the attribute/class combo we currently check.

### 3) Add a short-lived “startup watchdog” (defensive)
Because you’re seeing this on load, add a watchdog in `App.tsx` (or in `ScrollToTop.tsx`) that runs for the first ~3 seconds after mount:

- Every 250ms:
  - If `!isAnyOverlayOpen()` and we detect any scroll-lock style/attr/class → call `clearDocumentScrollLocks()`

Then stop the interval.

This prevents any “late-applied lock” from leaving the app permanently frozen.

### 4) Use the debugger to identify the real cause, then fix the source
Once the debugger is in, you (or I via session replay + screenshots) can quickly pinpoint:

- Which exact mechanism is locking scroll (overflow hidden vs fixed-position lock vs pointer-events none)
- Whether the app thinks an overlay is still open on load (stuck overlay node in DOM)
- Whether a specific global modal is opening/closing immediately on load and leaving the lock behind

Likely culprits (because they can appear on load):
- onboarding modal/tour
- premium dialog
- add-to-home-screen prompt (mobile only, but worth ruling out)
- any global dialog/sheet in header/nav contexts

Then we apply the smallest possible fix to that component:
- ensure proper `onOpenChange` wiring
- ensure parent overlay is closed before opening child overlay
- ensure no global style mutations are used
- ensure cleanup runs on unmount

---

## Files we’ll likely touch
- `src/components/ScrollToTop.tsx` (make detection robust + reuse shared utilities)
- `src/lib/scrollLock.ts` (may add a `hasDocumentScrollLock()` helper so logic is centralized)
- `src/App.tsx` (optional: add a short startup watchdog)
- New file: `src/components/ScrollLockDebugger.tsx` (gated debug overlay)

---

## How we’ll test (fast + deterministic)
1) Load any route with `?debugScroll=1` (especially `/welcome` and `/groups/...`).
2) Confirm the overlay shows:
   - scrollHeight > innerHeight (so the page should be scrollable)
3) If scroll is locked:
   - hit **Force unlock scroll**
   - verify scroll immediately works
4) Reload and watch the live fields:
   - if overflow/position/pointerEvents flips into a locked state after mount, we’ll see exactly which field changes
5) Repeat the flow you mentioned:
   - open group → open event → Share Event → close → confirm scroll remains unlocked

---

## Expected outcome
- We stop burning time on guess-and-check.
- Within one cycle, we’ll know whether the lock is:
  - Radix attribute/class based,
  - inline-style based,
  - pointer-events related,
  - or “overlay still present” related.
- Then we apply one precise fix to the actual culprit (instead of patching multiple places blindly).

