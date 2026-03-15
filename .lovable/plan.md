
Goal: make Practice List (Today’s Focus) reliably persist across navigation/session changes and remove the regression that makes content appear “gone”.

What I found (robust analysis)
1) Primary regression: identity mismatch (likely introduced during recent refactors)
- `daily_focus.user_id` is profile-scoped in DB policies (`profiles.id`), not auth-user scoped.
- Current `useDailyFocus` queries/mutations use `user?.id` (auth user id), not `profile?.id`.
- In this project, many users have `profiles.id != profiles.user_id` (20/91), so `daily_focus` read/write fails for them.
- This explains “used to work before” + now failing after account/schema/identity changes.

2) Secondary regression: hydration gate can hide already-saved data
- `TodaysFocus` only syncs DB text when `isInitialized === true`, but that flag is set from cache presence only.
- If cache is missing, DB data can load but UI still stays blank.

3) Data-loss amplifier: local cache isn’t created for first unsaved draft
- `updateLocalCache` only writes if an existing cache row/focus row exists.
- On first entry of the day (or if DB write fails), no local draft is persisted, so route change can appear to “erase” text.

4) Error handling gap
- Autosave marks changes as saved before mutation success.
- Mutation errors are not surfaced in UI, so users think save succeeded.

Implementation plan
1) Fix identity source everywhere for focus
- In `useDailyFocus`, switch canonical keying/querying/upserting to `profile?.id` (not `user?.id`).
- Gate queries with `enabled: !!profile?.id` (align with app architecture).
- Update `useFocusHistory` and `useFocusDates` similarly.
- Update callers (`TodaysFocus`, `PracticeControls`, `QuickNoteCapture`) to pass/read focus cache using profile id as primary scope.

2) Add cache migration + compatibility read path
- Keep backward compatibility by reading in this order:
  a) profile-scoped key
  b) legacy auth-user-scoped key
  c) legacy global key
- On successful read from legacy keys, migrate to profile-scoped key and clean legacy key.
- This avoids breaking existing users immediately.

3) Add true draft persistence (separate from persisted focus row)
- Introduce a dedicated draft cache key (text + updated_at, no DB row id dependency).
- Write draft immediately on every change.
- On mount, initialize editor from: unsynced draft > persisted focus cache > DB.
- This guarantees navigation to Profile/Friends and back never wipes unsynced text.

4) Harden save flow
- Convert focus save path to `mutateAsync`-based flush with explicit success/error handling.
- Only clear “dirty” state after successful backend save.
- On failure: keep draft, keep dirty flag, show lightweight toast (“Saved locally, retrying sync”).
- Keep current blur/pagehide/unmount flush behavior, but never drop local draft on failed network save.

5) Fix hydration logic regression
- Remove/replace `isInitialized` guard that blocks DB->UI sync when no cache exists.
- DB sync should apply when there are no newer local edits; use timestamp comparison (already partly present) against draft/persisted cache.

6) Consumer safety for note/session attachment
- When attaching focus to notes/sessions, only send `focus_entry_id` if it is a real persisted entry.
- If only draft text exists, attach `focusTextSnapshot` (and date) without invalid `focus_entry_id`.
- Prevents FK-related save failures and still preserves user context text.

7) Optional backend hardening (small migration)
- Add FK `daily_focus.user_id -> profiles(id)` (on delete cascade) to enforce correct identity shape and prevent future regressions from wrong ids.
- RLS itself can remain as-is (already secure and profile-scoped).

Files to update
- `src/hooks/useDailyFocus.ts`
- `src/components/TodaysFocus.tsx`
- `src/components/PracticeControls.tsx`
- `src/components/QuickNoteCapture.tsx`
- `supabase/migrations/*` (optional FK hardening)

Validation plan (end-to-end)
1) Reproduce your exact flow on mobile viewport:
- Start session -> type Practice List -> go to Profile -> go to Friends -> return Home.
- Confirm text remains immediately in UI.
2) Wait for autosave, hard refresh app, confirm same text rehydrates.
3) Test with bad network (offline/slow):
- Ensure text stays locally and syncs when back online.
4) Confirm attach-focus still works for Quick Notes + Session Notes.
5) Confirm no regression for users where `profiles.id == auth.user.id` and where they differ.

Technical details (for implementation)
- Canonical identity for focus domain = `profile.id`.
- Cache model split:
  - persisted focus cache (DB-backed entry with id)
  - draft cache (UI draft, no required DB id)
- Sync precedence:
  `draft(updated_at newer) > DB > persisted cache`.
- Save semantics:
  - debounce triggers async flush
  - success => clear dirty + refresh persisted cache
  - failure => retain dirty + retain draft + notify user.
