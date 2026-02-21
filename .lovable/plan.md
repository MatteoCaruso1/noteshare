

# Speed Up Practice Board Load on App Return

## Problem

When returning to the app during a session, the Practice Board takes 7-8 seconds to appear because of this waterfall:

```text
1. [Auth] getSession -> fetchProfile (2-4s on cold mobile connection)
2. [useTodaysFocus] enabled: !!profile?.id -> fires query
3. [daily_focus query 1] try today's focus -> maybe empty
4. [daily_focus query 2] fallback to recent focus -> return data
5. [TodaysFocus] isInitialized -> setText -> render
```

Each step is sequential -- nothing can start until the previous step finishes. On a cold mobile connection, steps 1-4 alone take 5-7 seconds.

## Solution

Cache the focus text in localStorage so it renders immediately on mount, before auth or any database query completes.

### File: `src/hooks/useDailyFocus.ts`

- After a successful fetch in `useTodaysFocus`, persist the result to `localStorage` (key: `noteshare_focus_cache`)
- Use the cached value as React Query's `placeholderData` so the component gets data instantly on mount, even before `profile?.id` is available
- The background fetch will silently replace the cached data once it arrives

### File: `src/components/TodaysFocus.tsx`

- Read the cached focus text from localStorage during initial state setup for `text`, so the textarea has content immediately
- Skip the loading skeleton when cached data is available -- show the real UI with cached content instead
- The existing `isInitialized` guard will update text once the fresh fetch completes (if different)

### After the fix:

```text
Mount -> read localStorage cache -> render Practice Board immediately (0ms)
Background: [Auth] -> [useTodaysFocus] -> silently updates if data changed
```

## Technical Details

### `src/hooks/useDailyFocus.ts` changes:
- Add a `FOCUS_CACHE_KEY` constant
- In `useTodaysFocus`, after the query returns data, write `{ focus_text, focus_date, id }` to localStorage
- Add `placeholderData` to the query options that reads from localStorage, so React Query returns data immediately before the network fetch

### `src/components/TodaysFocus.tsx` changes:
- Initialize `text` state from the localStorage cache (same key) instead of empty string
- Set `isInitialized` to `true` if cache was found (so the component doesn't flash empty then filled)
- Change the loading condition: only show skeleton if `isLoading && !focus` (i.e., no cached placeholder data available)

### No changes to:
- Database schema or queries
- Any other components or hooks
- The save/upsert logic

