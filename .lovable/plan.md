

## Problem

The `FloatingInstruments` component renders at `z-[5]`, but multiple page layers sit on top of it:

- **WelcomeHero** (landing page): uses `relative z-10`, completely covering the emojis
- **PageLayout**: uses `bg-background`, creating an opaque layer over the fixed-position emojis
- **Index page decorations**: same `z-[5]` but the `PageLayout` background still covers them

Since `FloatingInstruments` is `fixed inset-0 z-[5]` but the page content is rendered with opaque backgrounds at equal or higher z-index, the emojis are painted behind the visible content.

## Fix

1. **Raise `FloatingInstruments` z-index** from `z-[5]` to `z-[15]` — above page content but below modals/dialogs (which use z-50+). Keep `pointer-events-none` so it doesn't interfere with clicks.

2. **Make `PageLayout` background transparent** so the fixed emojis show through. The `bg-background` on `PageLayout` is redundant since `<body>` or `<html>` already sets the background. Change `bg-background` to `bg-transparent` on the `PageLayout` wrapper div.

3. **Ensure WelcomeHero doesn't block them** — the hero already uses `bg-transparent`, but its `z-10` still creates a stacking context. Lower WelcomeHero's root to `z-[6]` (above page content, below floating emojis at z-15), or alternatively keep z-10 but since the background is transparent the emojis will show through once the PageLayout background issue is resolved. Actually, since the hero is `bg-transparent` and uses `relative` (not `fixed`), the fixed-position emojis at a higher z-index will paint on top regardless. So raising FloatingInstruments to z-15 is sufficient.

4. **Verify the `animate-float-down` animation** works with inline `animationDuration` override — the Tailwind config defines `float-down` as `floatDown 30s linear infinite`, but the component overrides duration via inline style. This should work fine since inline styles take precedence.

## Files to Change

- **`src/components/FloatingInstruments.tsx`** — Change `z-[5]` → `z-[15]`
- **`src/components/PageLayout.tsx`** — Change `bg-background` → `bg-transparent` on the wrapper div (line 152)

This is a minimal, targeted fix. The emojis will float visibly above all page content while remaining non-interactive.

