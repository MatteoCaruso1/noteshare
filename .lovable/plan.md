
## Speed Up Organize Page Loading

### Problem

When navigating to the Organize page after returning to the app, it takes 10-15 seconds to show weekly goal progress and folder information. This is caused by a cascade of slow, sequential, and redundant network calls:

1. **`useProjects` makes 4 sequential Supabase calls**: `auth.getUser()` -> fetch profile -> fetch owned projects -> fetch collab projects. The first two are redundant since the auth context already has the profile.

2. **`useFriendsProjects` makes 4 sequential calls too**: `auth.getUser()` -> fetch profile -> fetch friendships -> fetch projects. Again redundant -- the `useFriendIds` shared hook already caches friend IDs.

3. **`useFriendsPromoPosts` has the same problem**: 4 sequential calls instead of using `useFriendIds`.

4. **No `staleTime` on key queries**: `useProjects`, `useFriendsProjects`, `useMyPromoPosts`, `useFriendsPromoPosts`, and `useWeeklyGoal` all have `staleTime: 0` (default). This means every navigation triggers a full refetch, even if data was fetched seconds ago.

5. **`useCurrentWeekPracticeMinutes` depends on `usePracticeStats`**: This is the heaviest query (fetches 3 months of sessions, notes, focus, and backlog), but it already has a 5-minute staleTime. However, it still needs to complete before weekly goal progress appears.

### Solution

#### 1. Refactor `useProjects` to use auth context (eliminate 2 redundant calls)
- Replace `supabase.auth.getUser()` + profile fetch with `useAuth()` profile from context
- This removes 2 sequential network calls, cutting the query to just 2 parallel project fetches

#### 2. Refactor `useFriendsProjects` to use `useFriendIds` hook
- Replace 3 sequential calls (getUser + profile + friendships) with the shared `useFriendIds` hook
- This leverages cached friend IDs and eliminates redundant fetches

#### 3. Refactor `useFriendsPromoPosts` to use `useFriendIds` hook
- Same pattern: replace manual friend ID fetching with the shared hook

#### 4. Add `staleTime` to all Organize page queries
- `useProjects`: add `staleTime: 2 * 60 * 1000` (2 minutes)
- `useFriendsProjects`: add `staleTime: 2 * 60 * 1000`
- `useMyPromoPosts`: add `staleTime: 2 * 60 * 1000`
- `useFriendsPromoPosts`: add `staleTime: 2 * 60 * 1000`
- `useWeeklyGoal` (both queries): add `staleTime: 2 * 60 * 1000`

#### 5. Add `staleTime` to `useGoals`
- Goals rarely change between page views; add `staleTime: 60 * 1000` (1 minute)

### Technical Details

**`src/hooks/useProjects.ts`** -- `useProjects()`:
- Add `useAuth()` to get `profile` from context
- Replace the `getUser()` + profile fetch with `profile.id`
- Run owned + collab project queries in parallel with `Promise.all`
- Add `enabled: !!profile?.id` and `staleTime: 2 * 60 * 1000`

**`src/hooks/useProjects.ts`** -- `useFriendsProjects()`:
- Add `useFriendIds()` hook
- Remove manual `getUser()` + profile + friendships fetching
- Use `friendIds` from the shared hook directly
- Add `enabled` and `staleTime: 2 * 60 * 1000`

**`src/hooks/usePromoPosts.ts`** -- `useFriendsPromoPosts()`:
- Add `useFriendIds()` hook
- Remove manual `getUser()` + profile + friendships fetching
- Add `staleTime: 2 * 60 * 1000`

**`src/hooks/usePromoPosts.ts`** -- `useMyPromoPosts()`:
- Add `staleTime: 2 * 60 * 1000`

**`src/hooks/useWeeklyGoal.ts`**:
- Add `staleTime: 2 * 60 * 1000` to both `currentWeekQuery` and `lastWeekQuery`

**`src/hooks/useGoals.ts`**:
- Add `staleTime: 60 * 1000` to the goals query

### Expected Impact

- Eliminates ~8 redundant sequential network calls on page load
- On re-navigation within 2 minutes, data loads instantly from cache (0ms)
- First load drops from 10-15 seconds to ~2-3 seconds (parallel queries only)
