

# Fix: Bottom Nav First-Tap Navigation Failure

## Problem

The bottom nav uses `onPointerDown` for its click handler, but `NavLink` navigates via the browser's `click` event. On mobile, there's a race condition:

1. `pointerdown` fires -- optimistic state is set, icon lights up
2. The React state update from step 1 causes a re-render between `pointerdown` and `click`
3. Occasionally, the re-render disrupts the synthetic `click` event chain, so `NavLink` never actually navigates
4. On the second tap, the component is stable (no state change since the route didn't change), so the `click` fires normally

This is an inherent risk of splitting user-facing feedback (`onPointerDown`) from navigation (`click`) -- they can fall out of sync.

## Solution

Use `onClick` instead of `onPointerDown` and add programmatic navigation via `useNavigate()` as a guarantee. This ensures navigation and visual feedback happen in the same event, eliminating the race.

### Changes to `src/components/BottomNav.tsx`

1. Import `useNavigate` from `react-router-dom`
2. Change `onPointerDown` to `onClick` on the `NavLink`
3. In `handleNavClick`, call `e.preventDefault()` to stop `NavLink`'s default navigation, then use `navigate(to)` programmatically -- this guarantees navigation happens in the same event handler as the optimistic state update
4. Update the handler signature from `React.PointerEvent` to `React.MouseEvent`

The result: one event (`click`) triggers both the visual highlight and the navigation, so they can never diverge.

## Why This Is Safe

- `onClick` on mobile fires after `touchend`, which is fast enough that users won't notice any difference vs `pointerdown`
- The optimistic route state still provides instant visual feedback within the same synchronous handler
- Programmatic `navigate()` is more reliable than relying on `NavLink`'s internal click handling after state changes

