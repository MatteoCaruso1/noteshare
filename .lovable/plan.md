

# Fix iOS Lock/Unlock Pause Bug + Session Resiliency

## Problem
When you lock your phone during a practice session and unlock it, the Pause button appears greyed out and eventually shows "Failed to pause session." This happens because:

1. The pause/resume mutations have no optimistic updates -- they wait for the server response before updating the UI
2. After iOS backgrounds the app, network requests can stall or fail silently
3. There's no retry mechanism, so a single network hiccup kills the action
4. The session data cache can become stale after backgrounding

## Solution

### 1. Add Optimistic Updates to Pause/Resume (useSessions.ts)
Currently `usePauseSession` and `useResumeSession` only update the UI after the server responds. We'll add `onMutate` handlers that immediately update the cached session data (like `useStartSession` and `useEndSession` already do), with rollback on error.

- `usePauseSession`: Optimistically set `paused_at` to now in the cache
- `useResumeSession`: Optimistically clear `paused_at` and update `paused_duration_ms` in the cache
- Both: Cancel in-flight refetches, snapshot previous data, rollback on error

### 2. Add Retry Logic to Pause/Resume Mutations (useSessions.ts)
Add `retry: 2` with a short delay so transient network failures after iOS resume are handled automatically.

### 3. Force Session Refresh on App Resume (PracticeControls.tsx)
Add a `visibilitychange` listener that, when the app returns to foreground, forces a refetch of the active session query. This ensures stale cached data is replaced with fresh server state.

### 4. Add Mutation Timeout Safety Net (useSessions.ts)
Wrap the pause/resume mutation functions with an AbortController timeout (10 seconds) so they don't hang indefinitely if the network is in a bad state after backgrounding.

## Technical Details

### File: `src/hooks/useSessions.ts`

**usePauseSession changes:**
- Add `onMutate` that cancels queries, snapshots previous session, and optimistically sets `paused_at` on the cached active session
- Add rollback in `onError`
- Add `retry: 2` to the mutation config
- Persist optimistic update to localStorage

**useResumeSession changes:**
- Add `onMutate` that cancels queries, snapshots previous session, and optimistically clears `paused_at` and computes `paused_duration_ms`
- Add rollback in `onError`
- Add `retry: 2` to the mutation config
- Persist optimistic update to localStorage

Both mutations will need to accept `userId` as a parameter (in addition to `sessionId`) so they can target the correct query cache key.

### File: `src/components/PracticeControls.tsx`

**Visibility change handler:**
- Add a `useEffect` that listens to `document.visibilitychange`
- When the app becomes visible, invalidate the `active-session` query to force a fresh fetch
- This ensures the UI syncs with reality after iOS lock/unlock

**Update pause/resume calls:**
- Pass `userId` (from `profile.id`) alongside `sessionId` to the updated mutation hooks

## What This Does NOT Change
- No database or schema changes
- No changes to session start/end flow (those already have optimistic updates)
- No changes to the UI layout or design
- PWA and web behavior unaffected
