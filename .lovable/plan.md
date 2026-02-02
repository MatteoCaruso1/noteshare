
Goal
- Ensure Focus Mode never darkens the Practice Session + Practice Board cards (including their text).
- Ensure toast notifications are never dimmed and always render above everything (including focused cards and the vignette).
- Fix this reliably across browsers (including ones without :has() support).

What’s actually going wrong (based on code + screenshot)
1) The vignette is a fixed overlay (body::before / body.session-active::before). Even if focused cards are “brighter”, they can still look dark if the overlay is painted above them.
2) The page transition wrapper (PageBody) uses `filter: blur(0px)` even when “visible”.
   - Any non-`none` filter creates a new stacking context.
   - This can cause z-index surprises where “fixed” elements rendered earlier in the React tree (including Sonner) end up visually behind later content that’s in a higher stacking context, even if the toast itself has a huge z-index.
   - This matches your symptom: toast appears behind Practice Board and also looks vignetted/dimmed.
3) The current dimming approach relies on `section:not(:has(.session-focus-card))`.
   - `:has()` support is not universal (especially on older iOS). If unsupported, the selector is ignored, and we lose the intended “only dim non-focused containers” logic.
   - That pushes the system to rely heavily on the vignette overlay, which is currently affecting the focused cards too.

Proposed approach (more robust layering + remove stacking-context traps)
A) Fix stacking context so toasts can always float above
1. Update `PageBody` so that when visible it uses `filter: none` (not `blur(0px)`).
   - Keep the blur only during the transition phase; once visible, remove the filter entirely.
   - This removes the persistent stacking context that can trap “fixed”/z-indexed UI beneath other layers.

2. Re-order toast mounting in `App.tsx` so toast providers render after the main app content (or at least after the router content).
   - Even if Sonner isn’t portaling, DOM order matters across stacking contexts.
   - Rendering toasts later makes them much harder to “cover” accidentally.

B) Make Focus Mode layering explicit (no more “hoping” z-index wins)
1. Make the vignette overlay definitively behind app content, not above it:
   - Set the vignette pseudo-element z-index to 0 (or negative).
   - Set `#root` to `position: relative; z-index: 1; isolation: isolate;`
   - This guarantees all normal UI is above the vignette by default.

2. Recreate the “darken everything except focus cards” effect without parent-opacity tricks:
   - Instead of dimming large containers with `opacity` (which can’t be overridden by children), apply a “dimming layer” to the page content itself using a backdrop-like technique:
     - Option 1 (CSS-only, simple): apply `filter: brightness(0.55) saturate(0.9)` to a wrapper element (e.g., `.page-body` or `main`) while active, then explicitly set `.session-focus-card { filter: none; }`.
       - This avoids the “children can’t override parent opacity” issue.
       - Works better than opacity because we can counteract with `filter: none` on the focused cards if applied at the right level.
     - Option 2 (most reliable): introduce a dedicated dimming overlay element (a real DOM node) that sits above general content but below focused cards by placing focused cards into a higher z-layer.
       - This requires slightly more structure, but becomes bulletproof.

3. Keep focused cards always bright:
   - Keep `.session-focus-card { position: relative; z-index: ... }`
   - Ensure the focus cards’ immediate card surfaces have solid backgrounds and are not inheriting any dimming filter.
   - Add a “focus layer” class to the main container holding PracticeControls + QuickNoteCapture + TodaysFocus if needed.

C) Toasts fully exempt from Focus Mode
1. Ensure Sonner and Radix toast containers:
   - are not inside any dimmed/filter wrapper, and/or
   - have `position: fixed` and live in the highest root stacking context (above `#root`).
2. Add stronger selectors for Sonner:
   - Sonner uses specific attributes; we’ll target `[data-sonner-toaster]` and also verify the actual generated structure in the DOM (quick console inspect during implementation).
3. If needed, portal Sonner toasts to `document.body` manually (only if Sonner’s default render isn’t enough after the above fixes).

Files I’ll touch (implementation phase)
- `src/components/PageLayout.tsx`
  - Change `filter: isVisible ? 'blur(0px)' : 'blur(2px)'` to `filter: isVisible ? 'none' : 'blur(2px)'`.
- `src/App.tsx`
  - Reorder `<Toaster />` and `<Sonner />` so they render after the router content (or at least after `<Routes/>`), ensuring they paint above the main UI.
- `src/index.css`
  - Make layering explicit:
    - Set vignette pseudo-element z-index lower.
    - Add `#root` stacking context.
    - Replace/adjust dimming rules to avoid `:has()` dependency and parent opacity problems.
  - Strengthen toast “exempt” styling:
    - Force `position: fixed` + high z-index on toast containers, and ensure no filters apply.

Validation checklist (what you’ll test after I implement)
1. Start a practice session:
   - Practice Session card title/body text remains identical brightness to Practice Board.
   - No vignette shading is visible “on top of” these cards (they should look fully clear).
2. Trigger a toast during an active session:
   - Toast is not dimmed.
   - Toast is not behind any card.
   - Toast remains clickable.
3. Mobile + desktop:
   - Confirm on mobile Safari/Chrome if possible (this is where stacking context issues often show up).
4. Regression checks:
   - Route transitions still feel smooth (PageBody blur still works during transitions).
   - Vignette still darkens the rest of the screen (non-focused content) in a pleasing way.

If anything still fights us after these changes
- I’ll switch to the “most reliable” structure: a dedicated FocusMode overlay + a dedicated FocusMode portal layer for focused cards and toasts. That completely removes ambiguity from stacking contexts and is the standard way to guarantee layering in complex UIs.
