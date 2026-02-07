
## Goal
Fix a mobile-only iOS Safari/PWA interaction bug where buttons inside the Metronome and Practice Timer popovers temporarily become “transparent / hollow” after tap, and only return to normal after tapping elsewhere. Ensure a robust solution that doesn’t depend on fragile `:active` / `:hover` behavior and works consistently across:
- Metronome “Start/Stop” button
- Practice Timer “Start / Pause / Resume / End” buttons
- Metronome quick-tempo buttons (60/80/100/120/140)
- Practice Timer presets (5/10/15/20/30)

## What’s happening (root cause)
In `src/index.css`, there is a touch-device-specific CSS block intended to prevent “stuck hover” on iOS:

```css
@media (hover: none) and (pointer: coarse) {
  button:not([aria-pressed="true"]):hover { background-color: inherit; }
  ...
}
```

On iOS Safari, after tapping a button, `:hover` can “stick” until the next tap. This rule forces the hovered button’s `background-color` to become `inherit` (often effectively transparent), which visually matches exactly what you’re seeing: a button looks unfilled until you tap elsewhere (which clears the stuck hover state).

This is also why it does not happen on desktop.

## Strategy (robust fix)
We’ll fix this at the correct layer: the global CSS rule that is causing the issue, and we’ll harden these particular controls so they are never affected by the “hover reset” logic.

### Design principles for the fix
1. **Do not globally override `button:hover` to `inherit` on touch devices**, because it breaks any button that relies on a real background color.
2. Keep the original intent (avoid “stuck hover” visuals), but **scope it narrowly** so it only affects elements where it’s safe.
3. Prefer **state-driven styling** and **explicit “mobile-safe” interaction handling** (blur on touch/pointer up) over relying on pseudo-classes.

## Implementation plan (code changes)

### 1) Replace the problematic touch hover reset in `src/index.css`
Update the touch-device `:hover` reset so it does not clobber real buttons.

Recommended approach:
- Introduce an opt-out attribute (e.g. `data-no-hover-reset`) and modify the selector so it only resets hover backgrounds for elements that do not opt out.
- Also avoid touching buttons that clearly have a background color class applied (we can’t reliably detect computed styles in CSS, so attribute-based is safest).

Concretely:
- Change:
  - `button:not([aria-pressed="true"]):hover { background-color: inherit; }`
- To something like:
  - `button:not([aria-pressed="true"]):not([data-no-hover-reset]):hover { background-color: inherit; }`

And similarly for `[role="button"]` / `.cursor-pointer` if needed.

Why this is robust:
- It preserves your original “unstick hover backgrounds” defense for most UI.
- It gives us a deterministic escape hatch for controls where hover resetting is harmful.

### 2) Mark Metronome + Practice Timer popover buttons as “no hover reset”
In:
- `src/components/Metronome.tsx`
- `src/components/PracticeTimer.tsx`

Add `data-no-hover-reset` to:
- Metronome Start/Stop button
- Tempo buttons (60/80/100/120/140)
- Practice Timer Start/Pause/Resume/End buttons
- Practice Timer preset buttons (5/10/15/20/30)

This ensures the global mobile hover reset never applies to these controls.

### 3) Simplify and harden “pressed/focus” behavior on mobile (optional but recommended)
Even after fixing the CSS root cause, iOS can still show odd “focused” states after taps on some elements, especially in overlays/popovers.

We will:
- Add a lightweight blur-on-interaction pattern to these specific buttons:
  - `onTouchEnd={(e) => e.currentTarget.blur()}`
  - `onPointerUp={(e) => (e.currentTarget as HTMLButtonElement).blur()}`
- Keep using `onClick` to trigger audio-related actions (important for iOS audio gesture rules).

This avoids “sticky focus” outlines and reduces the chance of iOS retaining a pseudo state.

### 4) Standardize the popover control buttons to use the shared `<Button />` component (targeted refactor)
Right now, these popover buttons are plain `<button>` elements. Your shared `src/components/ui/button.tsx` already includes:
- `touch-manipulation`
- `[-webkit-tap-highlight-color:transparent]`
- `active:scale-[0.98]`
- and importantly a built-in `onTouchEnd` blur handler.

We will refactor the Metronome and Practice Timer control buttons to use `<Button variant="default|secondary|outline" size="sm">` (or a small custom “tool button” variant if needed) so behavior is consistent and centralized.

Notes:
- We’ll keep visuals minimal (per your request) and remove fancy feedback.
- If the current exact sizing is important, we can keep the same `h-7 px-3` etc via `className` overrides on `<Button>`.

### 5) Verify that the popover trigger buttons are not impacted
The trigger buttons already have `active:bg-accent/80` and touch classes and are likely fine. But we’ll also add `data-no-hover-reset` to the trigger buttons for extra safety (since they are also buttons on touch devices inside a sticky-hover environment).

### 6) Mobile verification checklist (what you should test)
On an iPhone (Safari + “Add to Home Screen” PWA if you use it):
1. Open Metronome popover → tap Start → ensure button stays filled and does not turn transparent.
2. Tap Stop → same expectation.
3. Tap various tempo preset buttons → none should become transparent/hollow after tap.
4. Open Practice Timer → Start → Pause → Resume → End → none become transparent/hollow.
5. Tap somewhere else after tapping a control → nothing visually “snaps back” (because it should never break in the first place).
6. Repeat while scrolling the page (since stuck hover is often worse while scrolling).

## Risks / tradeoffs
- Narrowing the global “hover reset” may allow some other elements to show stuck hover again on iOS. Using `data-no-hover-reset` gives us control: we can apply it only where needed, and keep hover-reset behavior for other elements.
- Refactoring to `<Button />` could change spacing slightly; we’ll keep classes aligned to preserve layout.

## Files expected to change
- `src/index.css` (fix / scope the touch hover reset rule)
- `src/components/Metronome.tsx` (apply `data-no-hover-reset`, optional blur handlers, optionally replace with `<Button />`)
- `src/components/PracticeTimer.tsx` (same)
- Potentially (only if needed): `src/components/ui/button.tsx` (add `onPointerUp` blur in addition to `onTouchEnd`, or add a tiny variant/utility class for these compact controls)

## Acceptance criteria
- On iOS, tapping any button inside Metronome/Practice Timer popovers never causes it to become transparent/hollow.
- No “tap elsewhere to fix” behavior remains.
- Desktop behavior remains unchanged.
- Metronome/Timer functionality continues uninterrupted (audio + timing unaffected).
