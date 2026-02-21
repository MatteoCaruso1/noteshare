
# Fix Main Practice Page Load Time (3x Slower Since Traffic Increase)

## Diagnosis

I found **four critical performance problems** causing the slowdown on the main practice page:

### Problem 1: Refetch Loop -- Practice Stats Invalidates Notes
**This is the biggest issue.** Every time `usePracticeStats` finishes computing, it calls:
```
queryClient.invalidateQueries({ queryKey: ['notes'] });
queryClient.invalidateQueries({ queryKey: ['friends-notes'] });
```
This causes the entire notes timeline to refetch, which triggers another signed URL prefetch, another applause batch fetch, and potentially re-triggers practice stats again. With more users and more data, this creates a cascading refetch loop that compounds into massive delays.

### Problem 2: Redundant Auth Lookups in Feed Hooks
`useFeedProjects` and `useFeedGigs` each independently call `supabase.auth.getUser()` then query `profiles` to get the current profile ID -- even though `profile` is already available from `useAuth()`. That's **4 unnecessary sequential database queries** before the real data is even fetched.

### Problem 3: Notes Query Has No Limit
`useNotes` fetches ALL of a user's notes with no `.limit()`. As users practice more and create more notes, this query gets progressively slower. It also joins with 4 related tables (profiles, practice_sessions, projects, goals, promo_posts) for every single note. With traffic increasing, more notes means longer query times.

### Problem 4: Missing staleTime on Multiple Hooks
`useFeedProjects`, `useFeedGigs`, and `useTodaysFocus` have no `staleTime` configured, meaning they refetch on every window focus, mount, and navigation. With React Query's default behavior, this causes unnecessary repeated queries.

### Current waterfall:
```text
1. [auth]           getSession -> profile ------>
2. [useNotes]       ALL notes + 4 joins (no limit!) -> collaborators -> applause batch -> URL prefetch
3. [useFeedProjects] getUser -> profile -> projects  (redundant auth x2)
4. [useFeedGigs]     getUser -> profile -> gigs      (redundant auth x2)
5. [useAcceptedNoteShares] notes query
6. [useTodaysFocus]  2 sequential queries (no staleTime)
7. [MemoryReminder]  notes query
8. [usePracticeStats] 4 parallel queries -> invalidates notes + friends-notes -> REFETCH LOOP!
```

## Solution

### 1. Stop Practice Stats from Invalidating Notes (usePracticeStats.ts)
The `current_streak` update in profiles doesn't need to refetch all notes. Instead of invalidating notes queries (which causes full refetches of the entire timeline), update only the cached profile data in the notes query using `setQueriesData` to patch the streak value in-place. This eliminates the refetch loop entirely.

### 2. Eliminate Redundant Auth Lookups (useProjects.ts, usePromoPosts.ts)
Refactor `useFeedProjects` and `useFeedGigs` to use `useAuth()` for the profile ID instead of calling `getUser()` and querying `profiles` independently. This removes 4 unnecessary sequential queries.

### 3. Add Limit to Notes Query (useNotes.ts)
Add `.limit(200)` to the personal notes query. 200 notes is more than enough for the timeline (which only displays 10 at a time with "Load more"), and prevents the query from growing unbounded as users accumulate practice data over months and years.

### 4. Add staleTime to Feed Hooks (useProjects.ts, usePromoPosts.ts, useDailyFocus.ts)
Add `staleTime: 2 * 60 * 1000` (2 minutes) to `useFeedProjects`, `useFeedGigs`, and `useTodaysFocus` to prevent unnecessary refetches on window focus and navigation.

### After the fix:
```text
1. [auth]           getSession -> profile ------>
2. [useNotes]       Limited notes (200) + joins -> applause batch -> URL prefetch
3. [useFeedProjects] projects query (uses cached profile, staleTime)
4. [useFeedGigs]     gigs query (uses cached profile, staleTime)
5. [useAcceptedNoteShares, useTodaysFocus, MemoryReminder] parallel, with staleTime
6. [usePracticeStats] 4 parallel queries -> patches cache in-place (NO refetch cascade)
```

## Technical Details

### File: `src/hooks/usePracticeStats.ts`
- Remove the `queryClient.invalidateQueries({ queryKey: ['notes'] })` and `queryClient.invalidateQueries({ queryKey: ['friends-notes'] })` calls from the stats computation
- Keep the `profiles.update({ current_streak })` and `refreshProfile()` calls
- Add a targeted `setQueriesData` call that patches `current_streak` in any cached note author profiles, avoiding a full refetch

### File: `src/hooks/useProjects.ts`
- Refactor `useFeedProjects` to import and use `useAuth()` for `profile.id`
- Remove `getUser()` and `profiles` query calls
- Add `enabled: !!profile?.id`
- Add `staleTime: 2 * 60 * 1000`

### File: `src/hooks/usePromoPosts.ts`
- Refactor `useFeedGigs` to import and use `useAuth()` for `profile.id`
- Remove `getUser()` and `profiles` query calls
- Add `enabled: !!profile?.id`
- Add `staleTime: 2 * 60 * 1000`

### File: `src/hooks/useNotes.ts`
- Add `.limit(200)` to the personal journal notes query (not the project-specific query)

### File: `src/hooks/useDailyFocus.ts`
- Add `staleTime: 2 * 60 * 1000` to `useTodaysFocus`

### No changes to:
- Database schema or RLS policies
- UI layout or design
- Timeline component
- Other hooks
