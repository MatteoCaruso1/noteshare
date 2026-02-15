

## Fix FTUE Spotlight Tour on Safari Mobile

### Problem
Two bugs on Safari mobile (non-PWA):
1. Step 5 ("help-tips") highlights the wrong spot because the Profile page is scrolled down when the tour navigates to it -- the element's `getBoundingClientRect()` returns incorrect coordinates
2. After the tour completes and returns to the Practice page, the user is scrolled partway down instead of at the top

### Root Cause
- When navigating to `/profile` for step 5, no `scrollTo(0)` call is made before measuring the target element
- The final step's `scrollTo(0)` uses a single 100ms timeout which is unreliable on Safari mobile -- the page may not have finished rendering yet

### Changes

**File: `src/components/onboarding/SpotlightTour.tsx`**

1. **Add scroll-to-top when navigating for step 5**: After `navigate(currentTourStep.navigateTo)`, add a `window.scrollTo({ top: 0, behavior: 'auto' })` call before attempting to find the element. Also add it inside the `findElement` retry loop so each attempt re-scrolls to top first (Safari can restore scroll position asynchronously).

2. **Make final step scroll-to-top more robust**: Replace the single 100ms timeout with multiple attempts (e.g., scroll at 0ms, 100ms, and 300ms) to ensure Safari has time to finish its navigation and layout. This ensures the user lands at the very top of the Practice page.

3. **Add scroll-to-top inside `findElement` for navigated steps**: Before calling `updateTargetRect()`, force a `window.scrollTo({ top: 0 })` so the measured `getBoundingClientRect()` values are correct relative to the viewport at scroll position 0.

### Technical Detail

The key fix in the `findElement` function:
```typescript
const findElement = () => {
  // Ensure we're at the top before measuring
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  
  const found = updateTargetRect();
  if (found) {
    setIsNavigating(false);
    setTimeout(() => setIsAnimating(false), 350);
  } else {
    setTimeout(findElement, 100);
  }
};
```

And for the final step, use repeated scroll attempts:
```typescript
if (isFinalStep) {
  const scrollToTop = () => window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  navigate('/');
  scrollToTop();
  setTimeout(scrollToTop, 100);
  setTimeout(scrollToTop, 300);
  // ...
}
```

