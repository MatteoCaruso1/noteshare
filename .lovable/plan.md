

# Fix: Stuck Optimistic Session Recovery

## Root Cause

When starting a session, the code creates an optimistic session with a fake ID like `"optimistic-1772149310091"` and persists it to localStorage. If the network request fails (timeout, poor connection), the `onError` handler should roll back -- but the rollback restores the *previous* session (which was `null`), so it works. However, if the app is closed/backgrounded during the brief window between `onMutate` (optimistic write) and `onError` (rollback), the fake ID gets stuck in localStorage forever.

On next app open, `useActiveSession` loads this fake-ID session from `initialData`, the server query returns `null` (no active session in DB), but React Query may not immediately replace it due to `refetchOnMount` gating and `staleTime`. Even when it does refetch, the fake session keeps getting restored from localStorage on app restarts.

Every subsequent delete/end/pause/resume attempt sends `"optimistic-1772149310091"` to the database, which rejects it as an invalid UUID -- creating an infinite failure loop with no escape.

## Fix (3 changes in `useSessions.ts`)

### 1. Detect and discard optimistic IDs on load
In `useActiveSession`, after loading from localStorage via `getPersistedActiveSession`, check if the ID starts with `"optimistic-"`. If so, return `null` and clear localStorage. This immediately unblocks any stuck user.

### 2. Guard mutations against optimistic IDs  
In `useEndSession` and `useDeleteSession` `mutationFn`, check if `sessionId` starts with `"optimistic-"`. If so, skip the database call entirely, clear the active session from cache/localStorage, and return gracefully. This prevents the invalid UUID error from ever reaching the database.

### 3. Replace optimistic ID in onSuccess (already works, but add safety)
The existing `onSuccess` in `useStartSession` already replaces the optimistic data with real data. No change needed there, but we add a safety check in the query's `initialData` function.

## Technical Details

**File: `src/hooks/useSessions.ts`**

- `getPersistedActiveSession()`: Add a check -- if the persisted session's `id` starts with `"optimistic-"`, clear it from localStorage and return `null`.

- `useActiveSession` queryFn: After fetching from the server, if the server returns a real session, persist it. If `null`, clear localStorage (already done). Add a post-fetch check that if the cached/initial data had an optimistic ID but the server says no active session, the cache is definitively cleared.

- `useEndSession.mutationFn`: At the top, if `sessionId.startsWith('optimistic-')`, clear the session from cache and localStorage without hitting the DB, then return early.

- `useDeleteSession.mutationFn`: Same guard -- if `sessionId.startsWith('optimistic-')`, skip the DB call and just clear local state.

## Immediate Relief
Your current stuck session only exists in your phone's localStorage (the database has no active session). After this fix deploys, the next time you open the app, the optimistic session will be detected and discarded automatically. No manual intervention needed.

