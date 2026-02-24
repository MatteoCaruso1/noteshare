
## Fix: Practice Board Icon Disappearing and Notes Cache Being Wiped

### Bug 1: Practice Board toggle icon disappears on app resume

**Root cause**: In `PracticeControls.tsx` line 787, the focus toggle is conditionally rendered with `{currentFocus?.focus_text && (...)}`. The `useCurrentFocusEntry` hook does have `placeholderData` from localStorage cache, but it lacks `gcTime`. When the app resumes, if the query was garbage collected, `currentFocus` is briefly `undefined` before the placeholder kicks in, causing the toggle to flash away and back.

**Fix**: Add `gcTime: 10 * 60 * 1000` to `useCurrentFocusEntry` in `src/hooks/useDailyFocus.ts` (and the sibling `useTodaysFocus` for consistency). This keeps the cached data alive across tab switches and app resume, matching the pattern used by notes/projects/gigs hooks.

**File**: `src/hooks/useDailyFocus.ts` -- add `gcTime` to both `useTodaysFocus` and `useCurrentFocusEntry` queries.

---

### Bug 2: Notes disappear, only gigs show after app resume

**Root cause**: The `useNotes` hook has `enabled: !!profile?.id && !!session`. When you leave the app and come back, the Supabase auth client briefly sets `session` to `null` while it refreshes the JWT token. This flips `enabled` to `false`. When a React Query becomes disabled:

1. The query observer stops tracking the cache entry
2. The `data` property on the observer becomes `undefined`
3. `placeholderData` does NOT apply when a query is disabled -- it only applies during `pending` status of an enabled query

So notes vanish completely. Meanwhile, `useFeedProjects` and `useFeedGigs` do NOT depend on `session` (they only check `profile?.id`), so they remain enabled and their cached data stays visible. This creates the exact scenario shown in screenshot 2: gigs appear but notes are gone.

**Fix**: Remove the `!!session` requirement from the `useNotes` `enabled` guard. The Supabase client already handles auth token refresh internally -- the session is embedded in the client instance and requests will use whatever token is available. The `!!session` guard was overly cautious and creates this exact fragility.

Change `enabled` from:
```
enabled: projectId ? !!session : (!!profile?.id && !!session)
```
to:
```
enabled: projectId ? !!profile?.id : !!profile?.id
```

Which simplifies to just `enabled: !!profile?.id`.

**File**: `src/hooks/useNotes.ts` -- line 157, simplify the `enabled` condition.

---

### Summary

| File | Change |
|------|--------|
| `src/hooks/useDailyFocus.ts` | Add `gcTime: 10 * 60 * 1000` to `useTodaysFocus` and `useCurrentFocusEntry` queries |
| `src/hooks/useNotes.ts` | Remove `!!session` from `enabled` guard (line 157) -- simplify to `enabled: !!profile?.id` |

These are two small, targeted changes that address the actual root causes rather than symptoms.
