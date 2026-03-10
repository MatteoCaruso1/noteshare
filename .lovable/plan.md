

## Bug: Practice List content not persisting across sign-out/sign-in

### Root Cause

When the user signs out, the sequence is:
1. `supabase.auth.signOut()` invalidates the session
2. `onAuthStateChange('SIGNED_OUT')` fires → clears React Query cache, sets `user` to null
3. `TodaysFocus` component unmounts → cleanup effect tries to call `updateFocus(textRef.current)`
4. But `userId` inside the `useTodaysFocus` mutation is already `null` (read reactively from `useAuth()`)
5. The mutation throws `'Not authenticated'` and the unsaved text is lost
6. On next sign-in, the DB has no record of the edits

Additionally, the user-scoped localStorage cache (`noteshare_focus_cache:{userId}`) may still hold the text, but the re-hydration only works if the cache key matches, and the query ultimately overwrites it with whatever the DB returns.

### Fix (2 changes)

**1. `src/hooks/useDailyFocus.ts` — Use a ref for userId in the mutation**

Keep a `userIdRef` that retains the last non-null userId. Use this ref inside `mutationFn` so that even if `user` becomes null during sign-out, the mutation can still authenticate with the still-valid (briefly) Supabase session or at minimum identify the user for the upsert.

```ts
const userIdRef = useRef(userId);
useEffect(() => {
  if (userId) userIdRef.current = userId;
}, [userId]);
```

In `mutationFn`, use `userIdRef.current` as a fallback:
```ts
const effectiveUserId = userId || userIdRef.current;
if (!effectiveUserId) throw new Error('Not authenticated');
```

**2. `src/components/TodaysFocus.tsx` — Flush save synchronously before sign-out**

The more robust fix: ensure the save actually fires before auth is invalidated. Add an event-based mechanism:

- In `TodaysFocus`, listen for a custom `'noteshare:before-signout'` event that flushes pending changes synchronously (cancels debounce, calls `updateFocus` immediately).
- In `useAuth.tsx` `signOut()`, dispatch `'noteshare:before-signout'` **before** calling `supabase.auth.signOut()`, so the save runs while the session is still valid.

This ensures the 1-second debounce window doesn't cause data loss during sign-out.

### Summary of file changes

| File | Change |
|------|--------|
| `src/hooks/useAuth.tsx` | Dispatch `noteshare:before-signout` event before `signOut()` |
| `src/hooks/useDailyFocus.ts` | Add `userIdRef` fallback in mutation |
| `src/components/TodaysFocus.tsx` | Listen for `noteshare:before-signout` and flush pending save |

