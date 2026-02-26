

# Fix: "Link to Practice List" Toggle Not Showing

## Root Cause

In `PracticeControls.tsx` line 793, the "Link to Practice List" switch has a conditional `invisible` class:

```tsx
className={`... ${!currentFocus?.focus_text ? 'invisible' : ''}`}
```

This hides the toggle whenever `currentFocus?.focus_text` is falsy. The problem is that `currentFocus` comes from a database query (`useCurrentFocusEntry` -> `useTodaysFocus`), while the Practice List textarea content is driven by localStorage first (via `FOCUS_CACHE_KEY`). There are several scenarios where the Practice List has visible text but `currentFocus?.focus_text` is falsy:

1. **Debounce delay**: The user types in Practice List, but the 1-second debounced save hasn't fired yet, so no DB entry exists
2. **New day carry-forward**: Text is shown from localStorage cache, but the DB query hasn't completed yet
3. **First edit of the day**: The user starts typing but hasn't triggered the upsert, so today's `daily_focus` row doesn't exist yet

This explains why the toggle is missing even though the Practice List clearly has content (as seen in the screenshot).

## Fix

Change the visibility condition to also check the localStorage cache, which is the same source of truth the Practice List textarea uses. This adds zero performance overhead -- it's a single synchronous `localStorage.getItem` read done once at render time (already cached by the browser).

### Change in `src/components/PracticeControls.tsx`

Replace the `invisible` condition on the focus toggle (line 793) to also check `localStorage` for cached focus text. This way:
- If the DB has focus text -> show toggle (current behavior, works)
- If localStorage has focus text -> show toggle (new, fixes the gap)
- If neither has text -> hide toggle (correct, nothing to attach)

Specifically:
1. Import `FOCUS_CACHE_KEY` from `useDailyFocus`
2. Create a small helper or inline check that reads the cached focus text
3. Update the `invisible` condition: `!currentFocus?.focus_text && !cachedFocusText`

This is a minimal, zero-overhead change -- `localStorage.getItem` is synchronous and effectively free.

