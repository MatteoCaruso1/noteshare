

## Problem

The previous FTUE fix assumed email confirmation was required, but `enable_confirmations = false` — meaning signup creates an immediate session. The "Check your email" screen and toast are wrong; they block new users from entering the app.

The original FTUE bug was real (calling `startOnboarding()` + `navigate('/')` before the auth state listener fires), but the fix went too far by showing a confirmation screen.

## Fix

**1. `src/pages/Auth.tsx`**
- Remove the `signupSuccess` state and the "Check your email" card entirely
- After successful signup, wait briefly for the auth state to settle, then navigate to `/`
- The `isNewUser` detection in `useAuth` (profile age < 30s) will trigger the FTUE via `OnboardingContext`

**2. `src/hooks/useAuth.tsx`**  
- Change the `signUp` success toast back from "Check your email to confirm your account" to something like "Welcome to noteshare!" 
- Since `enable_confirmations = false`, the user is signed in immediately after `signUp`

**3. `src/contexts/OnboardingContext.tsx`**
- Keep the auth guard (requiring `profile?.user_id`) — that's a good safety net
- The FTUE will trigger naturally via the `isNewUser` flag once the auth state listener fires after signup

The key insight: with confirmations disabled, `signUp` creates a session immediately. We just need to navigate to `/` after signup and let the existing `isNewUser` detection handle the FTUE. We should NOT call `startOnboarding()` directly — the `OnboardingContext` already handles that when `isNewUser` is true.

