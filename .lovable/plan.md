
Goal
- Make “regular” (Radix/shadcn) toasts always appear above the persistent BottomNav in every state (normal, active practice session, quick note capture, etc.) with a fix that cannot drift as UI heights change.

What’s actually going wrong (why the previous fixes can still fail)
1) The offset is gated by `useIsMobile()`
- In `src/components/ui/toaster.tsx`, we only apply the `bottom` offset when `isMobile` is true:
  - `bottom: isMobile ? mobileBottomOffset : undefined`
- BottomNav is fixed and present across breakpoints in this app, so on wider viewports (>= 768px) `isMobile` becomes false, and the regular toast viewport falls back to `bottom: 0`.
- Result: on non-“mobile” viewports the toast can sit behind the BottomNav even though the mobile offset logic is correct.
- Sonner “feels” like it works more often because it’s typically positioned bottom-right and can visually avoid the nav content; but Radix viewport is bottom-center across widths and is more likely to overlap.

2) The hard-coded 92px / 112px can be wrong in real UI
- BottomNav height is not truly constant:
  - It includes safe-area padding + an extra 12px on max-md (`max-md:pb-[calc(env(...)+12px)]`)
  - It can be affected by font rendering, platform, and the keyboard-hide transform behavior.
- Even on mobile, if the real nav height is >92 or >112, a fixed offset can still allow partial overlap.

3) Stacking contexts can still bite us in edge cases
- BottomNav uses `transform: translate3d(...)` (iOS stability fix), which creates its own stacking context.
- While our z-index settings are high, rendering the toast layer in the same React tree can still be affected by ancestor stacking contexts/overflows in rare cases.
- Sonner internally behaves more “portal-like”; copying that strategy for Radix makes this class of issues go away.

Robust fix (make it impossible to be wrong)
A. Replace “mobile-only” offsets with a real measured BottomNav clearance
- Measure the actual rendered height of BottomNav (including safe-area and padding) using a `ResizeObserver`.
- Store that height in a global CSS variable on `document.documentElement` or `document.body`, e.g.:
  - `--bottom-nav-height: 104px`
- Then use this variable for both toast systems so they always clear the nav regardless of viewport size and future styling changes.

B. Use the same clearance variable for both Radix (regular) and Sonner (pro) toasts
- Regular Radix/shadcn toasts:
  - Set `ToastViewport` bottom to `calc(var(--bottom-nav-height, 0px) + 16px)` (16px gives breathing room equal to the viewport padding).
- Sonner toasts:
  - Instead of hard-coded 92/112 in `mobileOffset`, use:
    - `mobileOffset={{ bottom: "calc(var(--bottom-nav-height, 0px) + 16px)" }}`
  - And optionally also apply a similar bottom offset when not mobile (to cover the >=768 case).

C. Portal the “regular” Toaster to `document.body` (like your tours already do)
- Wrap the Radix ToastProvider/Viewport render with `createPortal(..., document.body)` so:
  - It escapes any page-level stacking contexts/overflow
  - It behaves more like Sonner and is reliably “top-layer UI”
- This is a defensive improvement that prevents future regressions.

Implementation steps (files and what will change)
1) `src/components/BottomNav.tsx`
- Add a stable selector for measurement, e.g. `data-bottom-nav="true"`.
- Add a small effect that:
  - Observes the nav element with `ResizeObserver`
  - Updates `document.documentElement.style.setProperty('--bottom-nav-height', `${height}px`)`
  - Also updates on `visualViewport.resize` (safe-area/keyboard changes) as a fallback

2) `src/components/ui/toaster.tsx` (Radix/shadcn “regular” toasts)
- Remove the `isMobile` gating for bottom positioning.
- Apply bottom offset using the CSS variable:
  - `bottom: "calc(var(--bottom-nav-height, 0px) + 16px)"`
- Keep z-index at 9999.
- Render via `createPortal` to `document.body` (guarded for SSR: only portal when `typeof document !== 'undefined'`).

3) `src/components/ui/sonner.tsx` (Pro/Sonner toasts)
- Replace the hard-coded `92px/112px` logic with the same CSS variable-based approach so both systems stay in sync.
- Ensure the offset applies in the relevant positioning mode(s) so desktop/tablet widths don’t regress.

4) `src/index.css` (optional tightening)
- Keep the existing `[data-radix-toast-viewport] { z-index: 9999 !important; }`.
- Optionally add a small safety rule:
  - `[data-radix-toast-viewport] { bottom: calc(var(--bottom-nav-height, 0px) + 16px) !important; }`
  - This is “belt and suspenders” if an inline style ever gets missed, but we’ll prefer keeping logic in React unless we see a reason to enforce via CSS.

Validation checklist (what you should see after)
- On mobile widths:
  - Regular toast never overlaps BottomNav in normal mode, practice active, quick note capture.
- On tablet/desktop widths:
  - Regular toast still clears the BottomNav (this is the big missing piece today).
- Regression check:
  - Sonner toasts continue to behave the same (still above nav).
- Stress test:
  - Rotate device / resize browser; open/close keyboard on touch device; trigger toasts during transitions.

Notes / tradeoffs
- Measuring real element height is more robust than maintaining “magic numbers” (92/112) and eliminates future tuning.
- Portaling the toast layer reduces the chance of stacking-context bugs and aligns with how top-level overlays are typically implemented.

Feature suggestions (next)
- Add a small “toast test” debug button (dev-only) to trigger both toast systems so you can verify stacking/offset quickly.
- Add an automated visual regression route that shows BottomNav + practice state + triggered toasts (useful before publishing).
- Add a unified “UI clearance” context (BottomNav height, session banners) so any overlay (dialogs, sheets, toasts) can position consistently.
- Add a safe-area/keyboard QA checklist screen to quickly validate iOS/Android layout behavior.
- Test end-to-end on mobile and desktop: trigger regular toasts from several actions (practice start/end, quick note capture, errors) and confirm they never sit under the BottomNav.
