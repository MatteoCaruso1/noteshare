
## Fix: Timeline Stutter on Mobile Load

### Problem
When the practice page loads on mobile, projects/gigs load faster than notes. The Timeline component immediately switches to "list" mode as soon as **any** content is available, even though notes haven't loaded yet. This causes projects to flash at the top, then jump down when notes arrive and the list re-sorts.

### Root Cause
In `Timeline.tsx`, the UI state machine has this logic:

```text
if (hasContent) -> immediately switch to 'list' mode
```

This ignores the `loading` prop entirely when content exists. It should **stay in loading mode until all data sources finish**, then render the final sorted list in one go.

### Solution
A single change in `src/components/Timeline.tsx`: modify the state machine so it only transitions to `'list'` when content exists **AND** loading is complete.

### Technical Details

**File: `src/components/Timeline.tsx`**

1. **Initial state** (line ~130): Change from `if (hasContent) return 'list'` to `if (hasContent && !loading && !isRefetching) return 'list'`

2. **State machine effect** (line ~148): Change the `hasContent` branch from immediately setting `'list'` to only doing so when `!isLoading`:
   - If `hasContent && isLoading` -- stay in `'loading'` mode (show skeleton)
   - If `hasContent && !isLoading` -- switch to `'list'` (show final sorted timeline)

This ensures the timeline waits for notes, projects, and gigs to all finish loading before revealing the unified, correctly-sorted list. The skeleton loading state will show until everything is ready, preventing any visual reordering.
