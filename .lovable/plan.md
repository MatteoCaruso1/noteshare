

## Fix Plan: Mobile Safari FTUE Issues

### Issue 1: "Loading error" toast on initial signup

The `InlineErrorBoundary` component in `ErrorBoundary.tsx` renders "Failed to load" as its fallback text. During signup, there's a race condition: `queryClient.clear()` fires on `SIGNED_IN` (in `useAuth.tsx` line 128), which can cause in-flight React Query fetches to fail momentarily while the profile/session is still being established. The `InlineErrorBoundary` catches this and shows "Failed to load" (which the user perceives as a "loading error" toast — though it's likely the inline fallback text appearing briefly, or a query error toast).

**Root cause**: The notes query (`useNotes`) fires before the profile is fully loaded after signup, fails (no auth context yet), and either the error propagates to a toast or the `InlineErrorBoundary` shows "Failed to load".

**Fix**: In `useNotes.ts`, the query should be disabled when `isOnboardingActive` is true (it already imports this flag). Additionally, suppress error toasts during the initial auth bootstrapping window by checking if profile exists before queries run. The key change is in `Index.tsx` — the `isBootstrapping` check already gates skeletons, but during onboarding, queries may still fire. We should ensure the notes query doesn't fire during onboarding by adding `enabled: !!profile?.id && !isOnboardingActive` to the query.

**Files**: `src/hooks/useNotes.ts` — add `isOnboardingActive` check to the `enabled` flag on the main `useNotes` query.

### Issue 2: Spotlight highlight positioned too low on mobile Safari

The `SpotlightTour` uses `getBoundingClientRect()` which returns viewport-relative coordinates. On mobile Safari, `forceScrollToTop()` is called but may not have taken effect by the time the rect is measured — Safari defers scroll updates. The highlight and tooltip position are thus offset by whatever residual scroll position exists.

**Fix**: 
1. In `forceScrollToTop()`, also reset the visual viewport scroll (mobile Safari uses `window.visualViewport`).
2. After calling `forceScrollToTop()`, use `requestAnimationFrame` before measuring the rect in `findAndHighlight()` to ensure the scroll has settled.
3. Add a secondary re-measurement after a short delay (e.g., 50ms) to handle Safari's async scroll behavior.

**Files**: `src/components/onboarding/SpotlightTour.tsx` — update `findAndHighlight` to wait a frame after `forceScrollToTop` before measuring rects, and add a secondary measurement pass.

### Issue 3: After FTUE ends, page is scrolled down with "My Practice" creeping above header

When `completeOnboarding()` fires, it cleans up the elevated elements and the portal overlay, but doesn't scroll to top. The `forceScrollToTop` in the final step only runs when entering the final step, not when dismissing it. Additionally, the `PageLayout` has `pt-12` for the fixed header, but after FTUE cleanup the scroll position may be left wherever the tour left it.

**Fix**:
1. In `OnboardingContext.tsx` `completeOnboarding()`, add `window.scrollTo({ top: 0, left: 0, behavior: 'auto' })` to ensure the page resets.
2. In `SpotlightTour.tsx`, when the final step overlay is clicked (triggering `onComplete`), also call `forceScrollToTop()` and clear any scroll restoration state.
3. Also clear `clearScrollState('index-timeline')` to prevent the scroll restoration hook from restoring a stale position.

**Files**: `src/contexts/OnboardingContext.tsx`, `src/components/onboarding/SpotlightTour.tsx`

### Summary of changes

| File | Change |
|------|--------|
| `src/hooks/useNotes.ts` | Add `!isOnboardingActive` to query `enabled` flag |
| `src/components/onboarding/SpotlightTour.tsx` | Defer rect measurement with rAF after scroll reset; force scroll to top on complete; clear scroll state |
| `src/contexts/OnboardingContext.tsx` | Add `window.scrollTo` and `clearScrollState` in `completeOnboarding` |

