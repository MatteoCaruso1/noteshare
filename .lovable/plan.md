

# Fix "Failed to Start Session" on First Attempt

## Problem
When opening the app on mobile and immediately starting a practice session, the first attempt fails with "Failed to start session." The second attempt works fine. This is a transient network issue — the first request hits a cold connection (DNS lookup, TLS handshake, or database cold start), and the mutation has no retry mechanism.

## Root Cause
`useStartSession` already has optimistic updates but lacks retry logic. The pause/resume mutations were just given `retry: 2` in the previous fix, but `useStartSession` was left without it.

## Fix

### File: `src/hooks/useSessions.ts`

Add retry and timeout to `useStartSession`, matching the pattern already used for pause/resume:

1. **Add `retry: 2`** with increasing delay (1s, 2s) so transient failures auto-recover without the user seeing an error
2. **Add AbortController timeout (10s)** to prevent the mutation from hanging indefinitely on a stalled connection
3. The optimistic update and rollback logic already exists and will continue working correctly with retries

### Technical Details

Changes to `useStartSession` mutation config:
- Wrap `mutationFn` body with a 10-second `AbortController` timeout (same pattern as pause/resume)
- Add `retry: 2` and `retryDelay` to the mutation options
- No changes to `onMutate`, `onSuccess`, or `onError` — those are already correct

This is a small, surgical change to one mutation. No other files need modification.

