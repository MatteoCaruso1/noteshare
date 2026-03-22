
Diagnosis

The bug is not the FTUE page reset anymore. The real problem is the global post-signup onboarding logic racing the FTUE commit:

1. `useAuth` marks the new account as `isNewUser = true` immediately after sign-in.
2. `OnboardingContext` sees `isNewUser` + `profile.has_completed_onboarding === false` and instantly starts the normal onboarding overlay.
3. The FTUE commit (`commit-ftue`) updates `has_completed_onboarding` only afterward, so it is too late.
4. Even after commit succeeds, the in-memory auth/profile state can still be stale, so onboarding can re-trigger when leaving `/ftue`.

The console confirms this order:
- `[Auth] Detected new user...`
- `[Onboarding] New user detected, starting onboarding`
- then FTUE commit succeeds after that

Plan

1. Block global onboarding while FTUE signup/commit is in progress
- Update `src/contexts/OnboardingContext.tsx`
- Before auto-starting onboarding, check whether the user is currently in the FTUE handoff flow:
  - current path is `/ftue`, or
  - FTUE local state exists with `readyForSignup` / signup-finalization steps
- If so, do not call `startOnboarding()`.

2. Clear the “new user” trigger as soon as FTUE commit succeeds
- Update `src/pages/FTUE.tsx`
- In the successful commit path, immediately:
  - refresh the profile from backend
  - clear the `isNewUser` flag
  - then move to FTUE final step
- This prevents the app from launching the regular onboarding when the user later lands on `/`.

3. Fix alternate FTUE completion paths too
- Update `src/pages/Auth.tsx` and `src/App.tsx`
- After successful FTUE commit in:
  - Google/OAuth FTUE signup flow
  - retry-commit flow
- also refresh profile + clear `isNewUser`, so every FTUE signup path behaves consistently.

4. Preserve normal onboarding for non-FTUE signups
- Keep `/auth` signups working exactly as before:
  - standard signup should still trigger the normal onboarding flow
  - only FTUE-originated signups should bypass it

Files to change

- `src/contexts/OnboardingContext.tsx`
- `src/pages/FTUE.tsx`
- `src/pages/Auth.tsx`
- `src/App.tsx`

Expected result

After account creation from the FTUE flow:
- the normal onboarding modal/spotlight will not appear
- the user will stay in FTUE and see only the final “Happy practicing” screen
- after continuing into the app, they will be released normally with no duplicate onboarding

QA checklist

- Email signup from FTUE
- Google signup from FTUE
- Retry-commit path after signup
- Leaving FTUE final screen to `/`
- Normal signup from `/auth` still shows standard onboarding
