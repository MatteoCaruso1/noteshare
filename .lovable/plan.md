

## Problem Analysis

Two issues:
1. **Mock content in FTUE tour**: The app tour (step 3) renders hardcoded fake UI instead of the real `PracticeControls`, `QuickNoteCapture`, `TodaysFocus`, and timeline components. The user wants the actual components.
2. **Create account appearing prematurely**: After the last tour highlight (notes timeline), tapping "continue" goes straight to the signup step. The user reports this still happens despite previous fixes.

## Approach

### Issue 1: Real Components in Tour

Rendering the actual components (`PracticeControls`, `QuickNoteCapture`, `TodaysFocus`) inside the FTUE tour is complex because they're deeply coupled to auth/premium/session hooks. Instead of refactoring all those components, I'll:

- **Replace the mock layout in `FTUEAppTour`** with the real Index page layout structure, importing and rendering the actual `PracticeControls`, `QuickNoteCapture`, and `TodaysFocus` components wrapped in the required `GlintProvider`
- The components will render in their "no auth" degraded state (collapsed cards with proper icons/labels), which is exactly what's needed for a tour — the user sees the real UI chrome
- For the timeline/notes section, render the real `Timeline` component with an empty notes array (showing the empty state), or render the same `Notes` header with the real card styling
- Wrap the tour content in the same providers used by `Index.tsx` (`GlintProvider`, etc.)
- Keep the spotlight overlay, bottom nav mock (since real `BottomNav` would try to navigate), and header mock as-is since those are structural

**Key insight**: The components won't crash without auth — they'll just show empty/loading states, which look real and are appropriate for a tour walkthrough.

### Issue 2: Tour Flow Completing Too Early

The tour has exactly 4 highlights and then calls `onComplete` → step 4 (signup). This IS the designed flow, but if there's a race condition or the `hadUserOnMount` guard is failing, the signup step appears prematurely.

I'll add a debug check and ensure that `ftue.nextStep()` from `onComplete` only advances to step 4 after all highlights are shown. I'll also verify the `didResetRef` logic isn't resetting step back to 0 and then immediately jumping.

**Root cause investigation**: The `useEffect` at line 365-399 fires when `user` exists AND `ftue.currentStep >= SIGNUP_STEP`. If `hadUserOnMount.current` is false (user wasn't logged in on mount) but the user somehow gets authenticated during the tour (e.g., from a previous session cookie), this effect would fire and jump to celebration. I'll tighten the guard to only commit when the user explicitly completed signup on step 4.

## Changes

### File: `src/pages/FTUE.tsx`

1. **Replace `FTUEAppTour` mock content** with real components:
   - Import `PracticeControls`, `QuickNoteCapture`, `TodaysFocus` from their actual locations
   - Import `GlintProvider` from contexts
   - Render these inside the tour layout with the spotlight overlay on top
   - Keep the mock header and bottom nav (they don't depend on auth)
   - For the Notes/Timeline section, render the real card frame with a "Notes" header and empty state or a simple placeholder that looks like the real thing

2. **Fix the premature signup issue**:
   - Add a `tourCompletedRef` flag that's only set to `true` when `FTUEAppTour.onComplete` fires
   - Gate the auto-commit `useEffect` on this flag, so even if a user session appears (from a stale cookie), the flow won't skip ahead unless the tour was explicitly completed AND the user reached step 4

3. **Ensure step progression**: After the tour completes (step 3 → step 4), only show the signup screen — not auto-commit. The auto-commit should only fire after the user actually creates an account on step 4.

