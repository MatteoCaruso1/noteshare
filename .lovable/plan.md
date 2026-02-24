

## Fix: Skeleton Visibility and Cache Fragility on Practice and Friends Pages

### Root Cause Analysis

The previous fix only changed `useFriendsNotes` and `useFriendIds`, but the same problems exist across **multiple hooks** feeding both pages. Here is what's actually happening:

**Practice page (Index.tsx):**
- Line 37-38: `useFeedProjects` and `useFeedGigs` destructure `isLoading` (NOT `isPending`)
- `isLoading` is `true` when data is stale and a background refetch is running -- this means the entire timeline gets gated behind a skeleton even though cached notes exist
- `isTimelineLoading = notesLoading || projectsLoading || gigsLoading` -- if ANY sub-query is "loading" (even just refetching stale data), the whole timeline shows the loading skeleton
- `useFeedProjects` and `useFeedGigs` have NO `placeholderData` and NO `gcTime`, so their caches evict after the default 5 minutes and data is lost entirely on tab switch

**Friends page (FriendsFeed.tsx):**
- `useFriendsFeedProjects` and `useFriendsFeedGigs` have NO `staleTime`, NO `gcTime`, and NO `placeholderData`
- This means their caches are immediately stale on remount and evict quickly
- Even though `useFriendsNotes` was fixed, the projects/gigs hooks can still trigger the loading state and block the whole feed

**The cascade problem:**
When ANY of the 3 data sources (notes, projects, gigs) loses its cache or enters `isLoading=true`, the entire timeline/feed shows a blank skeleton instead of displaying the cached notes that ARE available.

---

### Changes

#### 1. `src/pages/Index.tsx` -- Use `isPending` for all queries (2 lines)

Change `useFeedProjects` and `useFeedGigs` from `isLoading` to `isPending`. This ensures the timeline only shows a skeleton when there is truly NO cached data, not during background refetches of stale data.

```
Before: const { data: feedProjects, isLoading: projectsLoading } = useFeedProjects();
After:  const { data: feedProjects, isPending: projectsLoading } = useFeedProjects();

Before: const { data: feedGigs, isLoading: gigsLoading } = useFeedGigs();
After:  const { data: feedGigs, isPending: gigsLoading } = useFeedGigs();
```

#### 2. `src/hooks/useProjects.ts` -- Add cache resilience to `useFeedProjects` and `useFriendsFeedProjects`

Add `placeholderData` and `gcTime` to both hooks so cached data persists across tab switches:

- `useFeedProjects`: add `gcTime: 10 * 60 * 1000` and `placeholderData: (prev) => prev`
- `useFriendsFeedProjects`: add `staleTime: 2 * 60 * 1000`, `gcTime: 10 * 60 * 1000`, and `placeholderData: (prev) => prev`

#### 3. `src/hooks/usePromoPosts.ts` -- Add cache resilience to `useFeedGigs` and `useFriendsFeedGigs`

Same pattern:

- `useFeedGigs`: add `gcTime: 10 * 60 * 1000` and `placeholderData: (prev) => prev`
- `useFriendsFeedGigs`: add `staleTime: 2 * 60 * 1000`, `gcTime: 10 * 60 * 1000`, and `placeholderData: (prev) => prev`

---

### Why this is different from the previous fix

The previous fix only addressed `useFriendsNotes` and `useFriendIds`. But the loading gate on both pages combines THREE data sources (notes + projects + gigs), and the projects/gigs hooks were still using fragile defaults. This fix ensures ALL data sources feeding the timeline have consistent, resilient caching -- so switching tabs or briefly losing focus never wipes visible content.

### Summary table

| File | Hook | Change |
|------|------|--------|
| `src/pages/Index.tsx` | `useFeedProjects` | `isLoading` to `isPending` |
| `src/pages/Index.tsx` | `useFeedGigs` | `isLoading` to `isPending` |
| `src/hooks/useProjects.ts` | `useFeedProjects` | Add `gcTime`, `placeholderData` |
| `src/hooks/useProjects.ts` | `useFriendsFeedProjects` | Add `staleTime`, `gcTime`, `placeholderData` |
| `src/hooks/usePromoPosts.ts` | `useFeedGigs` | Add `gcTime`, `placeholderData` |
| `src/hooks/usePromoPosts.ts` | `useFriendsFeedGigs` | Add `staleTime`, `gcTime`, `placeholderData` |

