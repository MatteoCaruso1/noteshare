

## Fix: Loading Skeletons and Cache Fragility

### Issue 1: No loading skeleton in the Notes area (Practice page)

**Root cause**: The `Timeline` component does render skeletons, but there's a timing gap. When the page first mounts (or remounts after tab switch), the `showSkeleton` state initializes as `false`. Although it gets set to `true` in a `useEffect`, there's one render frame where `uiMode === 'loading'` but the skeleton content hasn't been triggered yet. More importantly, when cached data exists but is stale, `isPending` (`notesLoading`) is `false` -- so the Timeline enters `'list'` mode with zero items while the refetch is in progress, causing the blank area.

**Fix**: Initialize `showSkeleton` to `true` when `uiMode` starts as `'loading'`, eliminating the one-frame blank flash. This is a one-line change in the `useState` initializer.

**File**: `src/components/Timeline.tsx`

---

### Issue 2: Notes disappear when switching between app tabs

**Root cause**: Two problems compound:

1. **`useFriendsNotes`** has `staleTime: 60s` and `gcTime: 5min` but **no `placeholderData`**. When the FriendsJournals page remounts (React Router unmounts/remounts on tab switch), if data is stale (>60s old), React Query re-fetches and `isLoading` becomes `true`, wiping the screen to show skeletons. This is because `FriendsFeed` uses `isLoading` (which includes refetching from stale state) to gate the entire UI.

2. **`useNotes`** has better config (`placeholderData`, `staleTime: 2min`) but shares the same problem: the `enabled` condition requires `!!session`, and during app resume the session object may briefly be `null` while Supabase refreshes the auth token. When `enabled` flips to `false`, React Query clears the query observer's data reference.

**Fix (4 changes)**:

a. **`src/hooks/useFriendships.ts` -- `useFriendsNotes`**: Add `placeholderData: (prev) => prev` and increase `staleTime` to 2 minutes to match `useNotes`. This keeps previous data visible during background refetches.

b. **`src/components/FriendsFeed.tsx`**: Change from using `isLoading` (which is true during stale refetch) to `isPending` (which is only true when there's no cached data at all). This prevents the skeleton from replacing already-loaded content during a background refetch. Also add `isFetching` awareness to show a subtle indicator if needed.

c. **`src/hooks/useNotes.ts`**: The `enabled` guard requiring `!!session` can cause data to disappear during brief auth token refreshes. Keep the guard but the existing `placeholderData: (prev) => prev` should handle this. Verify and ensure `gcTime` is sufficient.

d. **`src/hooks/useFriendships.ts` -- `useFriendIds`**: Check caching -- if this hook loses its data, `useFriendsNotes` becomes disabled (`enabled: friendIds.length > 0`), cascading into data loss. Add `placeholderData` and increase `staleTime` if needed.

---

### Technical Summary

| File | Change |
|------|--------|
| `src/components/Timeline.tsx` | Initialize `showSkeleton` to `true` when `uiMode` starts as `'loading'` |
| `src/hooks/useFriendships.ts` | Add `placeholderData` + increase `staleTime` on `useFriendsNotes` and `useFriendIds` |
| `src/components/FriendsFeed.tsx` | Use `isPending` instead of `isLoading` for skeleton gating |

These are minimal, targeted changes that follow existing patterns already used in `useNotes`.
