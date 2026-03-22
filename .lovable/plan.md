
Goal: change `/ftue` from a 4-card teaser into a real pre-auth walkthrough that continues through starting a practice session, opening the save dialog, saving the session, showing the new note in the timeline, and only then showing account creation.

What I found
- The current signup jump is not accidental. It is hardcoded:
  - `src/pages/FTUE.tsx` step 3 renders `FTUEAppTour`
  - `FTUEAppTour` has only 4 highlights
  - the last tooltip button literally says `Continue to create account`
  - clicking it calls `onComplete()`, which does `ftue.nextStep()` to step 4
- So the primary trigger is the current FTUE design, not just a race condition.
- There are also secondary auto-signup/commit paths that must be tightened:
  - `src/pages/FTUE.tsx` auto-commit effect runs when `user` exists and stored step is `>= 4`
  - `src/pages/Auth.tsx` commits FTUE data after OAuth when stored step is `>= 4`
  - `src/App.tsx` `FTUERetryCommit` retries when stored step is `>= 4`
- `PracticeControls` and `QuickNoteCapture` `previewMode` currently only render collapsed headers, so they cannot support the “continue into a live session and save it” flow yet.

Implementation plan
1. Replace the current 4-step FTUE tour with a true interactive sequence
- Rework `src/pages/FTUE.tsx` so step 3 is no longer “tour complete -> signup”.
- Use the same order as the real onboarding tour:
  1. Practice button
  2. Practice routine
  3. Notes timeline
  4. Tap practice button
  5. Tap start live session
  6. Session notes area
  7. Recorder/media area
  8. Link to practice routine
  9. End session
  10. Save session
  11. Timeline result
  12. Then move to account creation
- The CTA text will never mention account creation until after save is finished and the saved note is visible.

2. Add a local-only FTUE preview state so the real UI can be used before auth
- Keep using the real components, but drive them with local FTUE preview state instead of backend mutations.
- Add explicit FTUE preview state such as:
  - `previewSessionStarted`
  - `previewSessionSaved`
  - `previewPracticeNotes`
  - `previewDurationMinutes`
  - `previewFocusLevel`
  - `previewTags`
  - `previewTimelineNote`
- This avoids fake mock cards while also avoiding backend writes before account creation.

3. Extend the real components to support FTUE preview interactions
- `src/components/PracticeControls.tsx`
  - expand `previewMode` so it can:
    - open the session chooser
    - show “Start Live Session”
    - enter an active-session layout locally
    - open the real `EndSessionDialog`
    - emit callbacks instead of calling `useStartSession` / `useEndSession`
- `src/components/EndSessionDialog.tsx`
  - allow FTUE preview save flow to reuse the same dialog UI with local callbacks
- `src/components/QuickNoteCapture.tsx`
  - keep visible in FTUE, but non-blocking while practice session preview is active, matching production behavior
- `src/components/TodaysFocus.tsx`
  - ensure it renders a stable open state during FTUE, using local draft/example content if no authenticated profile exists
- `src/components/Timeline.tsx`
  - feed it a locally created preview note after “Save Session” so the user sees the real timeline update

4. Remove step-number-based premature signup triggers
- Stop using `currentStep >= 4` as the signal that signup/commit may run.
- Introduce explicit FTUE progression flags instead, e.g.:
  - `canShowSignup`
  - `signupStarted`
  - `readyToCommit`
- Update these files to respect the new guards:
  - `src/pages/FTUE.tsx`
  - `src/pages/Auth.tsx`
  - `src/App.tsx`
- Result: even if a stale session exists, the app will not jump to account creation until the preview session has been saved and the flow has explicitly advanced.

5. Update FTUE persistence model so refresh/back navigation stays correct
- `src/hooks/useFTUEState.ts`
  - store the new preview-flow flags and preview note/session state
  - keep back-button behavior working on all pre-auth screens
  - preserve “most recent page” behavior without skipping ahead to signup on reload

Files I would change
- `src/pages/FTUE.tsx`
- `src/hooks/useFTUEState.ts`
- `src/components/PracticeControls.tsx`
- `src/components/EndSessionDialog.tsx`
- `src/components/QuickNoteCapture.tsx`
- `src/components/TodaysFocus.tsx`
- `src/pages/Auth.tsx`
- `src/App.tsx`

Expected result
- Get Started always begins at FTUE welcome
- The spotlight tour continues into the actual practice-session flow
- User can start a preview session, review/save it, and then see it appear in Notes
- Account creation appears only after that saved-session moment
- Existing OAuth/retry logic no longer forces signup early because it will depend on explicit FTUE completion flags, not the old numeric step threshold