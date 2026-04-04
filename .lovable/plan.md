

## Problem Analysis

All four broken items share the same root cause: they render Unicode characters (musical symbols or emoji) as **inline text content** styled with the app's custom font (`Inter`). The `Inter` font does not contain glyphs for musical symbols (`♪`, `♫`, `𝄞`, `♭`, `♯`, `𝄢`) or certain emoji (`✨`, `🎉`). 

The Tailwind `sans` font stack fix added emoji fallback fonts (`Apple Color Emoji`, etc.), but this only works for elements that inherit from `font-sans`. The issue is that **WKWebView on iOS** (used by Capacitor) handles font fallback differently than desktop browsers — when a loaded web font (`Inter`) doesn't have a glyph, WKWebView may show a question mark box instead of falling through to system fallbacks.

The broken items:
1. **Static decorations** (WelcomeHero.tsx) — `♪`, `♫`, `𝄞`, `♩`, `𝄢`, `♬`, `♭`, `♯`
2. **Falling emojis** (FloatingInstruments.tsx) — same musical symbols
3. **Weekly goal celebration** (SimpleGoals.tsx) — `🎉`
4. **Awards sparkle** (AwardsSection.tsx) — `✨`

## Fix

Apply `font-family: system-ui, 'Apple Color Emoji', 'Segoe UI Emoji', sans-serif` directly to all elements that render standalone Unicode symbols/emoji. This forces WKWebView to use system fonts that contain these glyphs, bypassing the `Inter` font entirely for these decorative characters.

### Changes

**1. `src/index.css` — Add a global utility class**

Add a CSS class `.emoji-text` that forces system font rendering:

```css
.emoji-text {
  font-family: 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji', system-ui, sans-serif;
}
```

**2. `src/components/FloatingInstruments.tsx`**

Add `emoji-text` class to each floating symbol `<div>`.

**3. `src/components/WelcomeHero.tsx`**

Add `emoji-text` class to the 8 static musical symbol `<div>` elements (lines 62-71).

**4. `src/components/AwardsSection.tsx`**

Add `emoji-text` class to the `✨` sparkle text element.

**5. `src/components/SimpleGoals.tsx`**

Wrap the `🎉` emoji in a `<span className="emoji-text">` so it renders correctly on iOS.

**6. Global sweep** — Apply the same fix to other emoji-containing elements found in the codebase (toast messages with emoji like `🎉`, `🏆`, event type icons like `🎸`, `🎹`, etc.) to prevent future reports of the same issue. Key files:
- `src/hooks/useGoals.ts` — toast messages with 🎉
- `src/hooks/useAchievementToasts.ts` — toast with 🏆  
- `src/components/CheckoutDialog.tsx` / `LifetimeCheckoutDialog.tsx` — 🎉
- `src/components/groups/CreateEventDrawer.tsx` — event type emoji
- `src/pages/FTUE.tsx` — 🎉
- `src/components/ManagePlansSection.tsx` — ✨
- `src/components/shared/AddNoteDialog.tsx` — 🎵

For toast messages (which are string-only), the fix won't apply via className. These are less likely to be affected since Sonner renders toasts with its own font stack, but the visible UI elements above are the priority.

