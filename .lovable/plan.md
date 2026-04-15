

# How Users Bypass FTUE — Analysis and Fix

## What's Happening

The `/auth` page exposes a **full signup form** (email + Google OAuth) that is completely independent of the FTUE flow at `/ftue`. Users can:

1. **Navigate directly to `/auth`** (e.g., type the URL, bookmark, or find it via search)
2. **Click "I Already Have an Account"** on marketing pages → goes to `/auth?mode=login`, but once there they can switch to signup mode

When signing up via `/auth`, the `commit-ftue` function never runs because there's no FTUE state in localStorage. The old `OnboardingContext` spotlight tour fires instead, but it doesn't collect name/instrument or create a note — it's just UI tooltips.

This explains the Matthew accounts: they signed up directly at `/auth`, completed the lightweight spotlight onboarding (which marked `has_completed_onboarding = true` and logged steps 110/111), but never went through the real FTUE.

## Proposed Fix

**Redirect all new signups through FTUE** — remove the signup capability from `/auth` entirely.

### Changes

1. **`src/pages/Auth.tsx`** — Remove all signup-related UI:
   - Remove the "Sign up with Email" button and the signup form mode
   - Remove the "Sign up with Google" button (keep "Log in with Google")
   - The page becomes login-only (sign in + forgot password)
   - Add a "Don't have an account? Get Started" link that navigates to `/ftue`

2. **`src/components/MarketingCTA.tsx`** — No changes needed (already routes new users to `/ftue`)

This ensures the only path to create an account goes through FTUE, where name, instrument, and an initial note are captured.

### What We're NOT Changing
- The FTUE flow itself (already works correctly)
- Google OAuth login for existing users (stays on `/auth`)
- The `OnboardingContext` spotlight tour (serves as a safety net but won't fire for FTUE users)

