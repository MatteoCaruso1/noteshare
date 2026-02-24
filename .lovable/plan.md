

## Fix: Notes Disappearing When Starting a Practice Session

### Root Cause

The Timeline uses `isPending` from three data sources (notes, projects, gigs) to determine the `loading` prop. When a practice session starts, a brief auth/profile state change can cause `profile?.id` to momentarily become undefined, which changes the React Query keys (e.g., `['notes', undefined, undefined]`). Since there's no cached data for the new key, `isPending` flips to `true`, and the Timeline's state machine forces `uiMode = 'loading'`, hiding all existing content.

The sequence you see:
1. Notes visible (cached data for old key)
2. Profile flickers -> notes query gets new key -> `isPending = true` -> notes vanish, but gigs/folders still cached
3. Gigs/folders query also gets new key -> everything vanishes
4. Profile stabilizes -> queries refetch -> content reappears

### Fix

**File: `src/components/Timeline.tsx`** (lines 160-164)

The state machine currently forces loading mode whenever `loading` is `true`, even if we already have content. The fix: once content has been displayed, never go back to loading/skeleton state. Only show loading on the true cold start (first ever load with no data).

Change the logic at line 160-164 from:

```
if (loading) {
  setUiMode('loading');
  return;
}
```

To:

```
if (loading && !hasContent) {
  setUiMode('loading');
  return;
}

if (loading && hasContent) {
  // Background reload - keep showing existing content
  return;
}
```

This ensures that once notes/gigs/folders are on screen, they stay visible even if a query key change triggers `isPending = true` momentarily. The user will never see their timeline disappear during a session start.

### Why This Is Safe

- Cold start (no cached data): Still shows loading skeletons as before
- Background refetch with existing data: Keeps content visible (no flicker)
- The `isRefetching` prop already handles showing a subtle loading indicator if needed

### Summary

| File | Change |
|------|--------|
| `src/components/Timeline.tsx` | Guard loading state: only show skeletons when `loading` is true AND there is no existing content |
