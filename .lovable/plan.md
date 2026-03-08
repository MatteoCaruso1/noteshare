

## Problem Diagnosis

The bug is in `src/pages/Auth.tsx` lines 220-229. After email signup:

```typescript
await signUp(email, password, name);
startOnboarding();  // ← triggers FTUE overlay immediately
navigate('/');       // ← sends user to home, but they're NOT signed in
```

Email signup requires email confirmation, so after `signUp()` succeeds the user has **no session**. But the code immediately starts the onboarding tour and navigates to `/`, which renders the landing page (since there's no auth). The user sees the FTUE overlaid on the landing page, gets navigated around by the spotlight tour without being authenticated, and can never log in because their email isn't confirmed yet.

Google OAuth works because it creates a confirmed session immediately.

## Fix

**1. `src/pages/Auth.tsx`** — After email signup, do NOT start onboarding or navigate. Instead, show a confirmation screen telling the user to check their email. The `isNewUser` detection in `useAuth` (profile age < 30s on `SIGNED_IN` event) will naturally trigger the FTUE when they confirm and sign in for the first time.

- Remove `startOnboarding()` call after signup
- Remove `navigate('/')` after signup
- Set a new state `signupSuccess` to show a "Check your email" confirmation UI
- Change the success toast from "Welcome to Noteshare!" to "Check your email to confirm your account"

**2. `src/hooks/useAuth.tsx`** — Update the `signUp` toast message to say "Check your email to confirm your account" instead of "Welcome to Noteshare!"

**3. `src/contexts/OnboardingContext.tsx`** — Add a guard: only trigger onboarding if user actually has a session (is authenticated). This prevents any edge case where onboarding fires without auth.

These changes are minimal and won't affect the Google OAuth flow, which already works correctly via the `isNewUser` detection path.

