

## FTUE Fix Plan

### Problem Analysis
From the screenshots, two issues:
1. **Pages scrolled down during tour** — The spotlight highlights land on wrong elements because the page isn't at scroll position 0. The `scrollTo` calls happen but Safari's async scroll restoration fights them. The current code only scrolls once in `findElement`, but content may still be loading/settling.
2. **"Welcome to noteshare!" toast** — Fired in `signUp()` in `useAuth.tsx` (line 213), overlaps with the welcome modal.

### Changes

**1. `src/components/onboarding/SpotlightTour.tsx`** — More aggressive scroll-to-top on every step
- Add multiple `scrollTo(0,0)` attempts with delays before measuring elements (similar to what's done for the final step), on ALL steps — not just after navigation.
- Add a brief delay before the first `findElement` call to let the page settle after scroll.
- Re-measure after a short additional delay to catch late layout shifts.

**2. `src/hooks/useAuth.tsx`** — Remove the `toast.success('Welcome to noteshare!')` call in `signUp()` (line 213), since the welcome onboarding modal handles this.

