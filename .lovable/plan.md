
# Fix Friends Page 20-Second Load Time

## Diagnosis

The Friends page has **three critical performance problems** causing the 20-second load:

### Problem 1: Friendships fetched 3 times in parallel
Three hooks each independently fetch the same friendships list before doing their real work:
- `useFriendsNotes()` -- fetches friendships, then notes
- `useFriendsFeedProjects()` -- fetches auth user, then profile, then friendships, then projects
- `useFriendsFeedGigs()` -- fetches auth user, then profile, then friendships, then gigs

That's **3 duplicate friendships queries** plus the projects/gigs hooks each make 3 sequential requests (getUser -> getProfile -> getFriendships) before even starting their real query. Total: ~9 unnecessary round-trips.

### Problem 2: N+1 applause queries
After notes load, the prefetch loop in `FriendsFeed.tsx` fires **one query per note** to fetch applause. With 10 notes displayed, that's 10 sequential-ish database calls. Each `ApplauseFooter` component **also** calls `useNoteApplause(noteId)` which fires yet another query if the prefetch hasn't landed yet.

### Problem 3: Avatar prefetch edge function call
The avatar prefetch calls an **edge function** (`get-signed-url`) which adds another network round-trip with cold-start latency.

### The waterfall looks like this:

```text
1. [useFriendsNotes]     friendships ---------> notes ----------->
2. [useFriendsFeedProj]  getUser -> profile -> friendships -> projects ->
3. [useFriendsFeedGigs]  getUser -> profile -> friendships -> gigs ----->
4. [avatar prefetch]     ----------------------------------------> edge fn ->
5. [applause prefetch]   ----------------------------------------> note1, note2, note3... (N queries)
6. [ApplauseFooter x10]  ----------------------------------------> note1, note2... (if cache miss)
```

Total sequential depth: ~6-8 network hops, with N+1 at the end. At ~200-500ms per hop on mobile, that's 10-20 seconds.

## Solution

### 1. Shared friend IDs hook (eliminate 3x duplication)
Create a single `useFriendIds()` hook that fetches friendships once. All three feed hooks consume it instead of re-fetching.

### 2. Batch applause into a single query (eliminate N+1)
Replace the per-note applause prefetch loop with a single batch query using `.in('note_id', noteIds)`. The `batchFetchApplause` function already exists in `useNotes.ts` -- reuse it in `FriendsFeed.tsx`. This turns 10 queries into 1.

### 3. Eliminate redundant auth/profile lookups in projects and gigs hooks
`useFriendsFeedProjects` and `useFriendsFeedGigs` each call `getUser()` then query `profiles` to get the current profile ID. The profile is already available from `useAuth()` -- pass it in instead.

### 4. After the fix, the waterfall becomes:

```text
1. [useFriendIds]        friendships --------->
2. [notes + projects + gigs in parallel]       notes, projects, gigs ->
3. [batch applause - 1 query]                  -----------------------> all applause
```

Total: 3 sequential hops instead of 8+N. Target: under 2-3 seconds.

## Technical Details

### New file: `src/hooks/useFriendIds.ts`
A small hook that fetches accepted friendships and muted friends, returning `friendIds` (excluding muted). Cached with `staleTime: 60s`.

### Modified: `src/hooks/useFriendships.ts`
- `useFriendsNotes()`: Remove the inline friendships fetch. Accept `friendIds` from `useFriendIds()` via the `enabled` + `queryFn` pattern, or restructure to use the shared hook internally.

### Modified: `src/hooks/useProjects.ts`
- `useFriendsFeedProjects()`: Remove `getUser()`, `getProfile()`, and friendships queries. Import `useAuth()` for `profile.id` and `useFriendIds()` for friend IDs. Single query for projects.

### Modified: `src/hooks/usePromoPosts.ts`
- `useFriendsFeedGigs()`: Same treatment -- remove redundant lookups, use shared `useFriendIds()`.

### Modified: `src/components/FriendsFeed.tsx`
- Replace the per-note applause prefetch `useEffect` (lines 155-186) with a single batch call using `batchFetchApplause()` from `useNotes.ts`. When notes arrive, call it once with all note IDs, then seed each `['applause', noteId]` cache entry.
- Export `batchFetchApplause` from `useNotes.ts` (or move to `useApplause.ts`).

### Modified: `src/hooks/useNotes.ts`
- Export the existing `batchFetchApplause` function so `FriendsFeed` can use it.

### No changes to:
- Database schema or RLS policies
- `ApplauseFooter` component (it will simply find data already in cache)
- UI layout or design
