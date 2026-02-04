
Goal
- Make Sonner toasts disappear with a smooth opacity-only fade (no downward/translate movement), and remove the “choppy” exit velocity changes.

What’s going wrong (root cause)
1) You have multiple, conflicting toast rules fighting each other:
   - src/components/ui/sonner.tsx sets zIndex: 40 and bottom: 16px (to sit “behind” the bottom nav).
   - src/index.css currently forces:
     - [data-sonner-toaster] bottom: calc(80px + …) !important (puts the toaster above the nav)
     - [data-sonner-toaster], .toaster z-index: 99999 !important (puts the toaster above the nav)
   These global overrides negate the component-level settings and can also cause visible “movement” as layout/stacking recalculates.

2) The animation override is targeting the wrong attributes:
   - Sonner does NOT use data-state="closed" for exit.
   - Sonner’s own CSS exits via:
     - [data-sonner-toast][data-removed='true' ...] rules that change --y (which directly changes transform), producing the downward slide.
   So our current selector ([data-sonner-toast][data-state="closed"]) never actually hits, and Sonner’s default transform-based exit continues to run.

3) Why it looks choppy
   - Sonner’s exit changes both transform and opacity, and sometimes changes transition timing (e.g. transform 500ms, opacity 200ms for some states).
   - When stacked toasts reflow (front/non-front, expanded/collapsed), transform is recalculated via CSS variables, which can look like “speed up / slow down” mid-flight.

Implementation plan (code changes)
A) Remove/neutralize the global CSS that is overriding placement and z-index
File: src/index.css
- Delete or rewrite these sections:
  1) “Position Sonner toasts above bottom nav on mobile”
     - Remove:
       @media (max-width: 768px) { [data-sonner-toaster] { bottom: calc(80px + …) !important; } }
     - Reason: it forces the toaster above the nav and contradicts your desired “behind nav” behavior.
  2) “TOAST LAYERING - ALWAYS ABOVE EVERYTHING”
     - Replace z-index: 99999 !important with a controlled value that respects the bottom nav.
     - New behavior:
       - Keep toaster fixed, but set z-index to 40 (or whatever value is below the nav’s z-50).
       - Example target:
         [data-sonner-toaster],
         .toaster,
         [data-radix-toast-viewport] { z-index: 40 !important; }
     - Reason: This restores the intended layering (nav above toast) while still keeping toasts above the vignette (the vignette is behind app content via z-index 0; we’ll keep the “session-focus-exempt”/filter exemptions as-is).

B) Replace the incorrect “data-state=closed” override with the correct Sonner exit override
File: src/index.css
- Remove the current block that targets:
  [data-sonner-toast][data-state="closed"] { ... }
  [data-sonner-toast][data-state="open"] { ... }
- Add a correct override that targets Sonner’s real exit mechanism:
  - Base: Sonner exits when data-removed="true"
  - We want:
    - Opacity fades to 0
    - Transform does not animate to an “exit” position (no translate down/up)
    - Transition-property limited to opacity on removal

  Proposed CSS (high level):
  1) For removed toasts, force opacity-only transition:
     [data-sonner-toast][data-removed='true'] {
       opacity: 0 !important;
       transition-property: opacity !important;
       transition-duration: 220ms !important; /* tuneable */
       transition-timing-function: cubic-bezier(0.2, 0, 0, 1) !important;
     }

  2) Prevent Sonner’s exit rules from changing the transform via --y:
     Sonner changes --y in multiple selectors (front/non-front, expanded true/false).
     We will override those selectors with “keep the non-removed positioning value” for --y so the toast stays in place and only fades.

     Concretely, we will override these Sonner cases (from node_modules/sonner/dist/styles.css):
     - [data-sonner-toast][data-removed='true'][data-front='true'][data-swipe-out='false']
     - [data-sonner-toast][data-removed='true'][data-front='false'][data-swipe-out='false'][data-expanded='true']
     - [data-sonner-toast][data-removed='true'][data-front='false'][data-swipe-out='false'][data-expanded='false']

     And set --y back to their “non-exit” equivalents:
     - For front toast: use the mounted/expanded position:
       --y: translateY(calc(var(--lift) * var(--offset))) !important;
     - For non-front toasts: use the stacking position (same idea Sonner uses to stack):
       --y: translateY(calc(var(--lift-amount) * var(--toasts-before))) scale(calc(-1 * var(--scale))) !important;

     This avoids the downward/upward “fly away” entirely while still keeping the toast located where it already is in the stack.

  Notes:
  - We keep swipe-out animations intact (data-swipe-out='true') so gestures still work naturally; the change applies to standard dismiss/timeout removal.

C) Simplify Sonner className exit attempts in the React wrapper (optional cleanup, but recommended)
File: src/components/ui/sonner.tsx
- Since the global CSS will now correctly control exit, we should avoid adding Tailwind “data-[state=closed]…” classes that don’t match Sonner’s attributes.
- Update toastOptions.classNames.toast to remove:
  data-[state=closed]:...
- Keep your styling (bg/text/border/shadow, session-focus-exempt, etc.) but do not try to drive exit via non-existent state attributes.

D) Verification steps (how we’ll confirm it’s fixed)
1) Trigger a toast and let it auto-dismiss:
   - Confirm: it fades out in-place (no downward slide).
2) Trigger multiple toasts in quick succession:
   - Confirm: no choppy velocity changes when one disappears and others re-stack.
3) On mobile:
   - Confirm: toast is visually behind the bottom nav (nav covers toast if they overlap), but toast is not dimmed by the practice vignette.
4) Confirm we didn’t break swipe-to-dismiss (if you use it):
   - Swipe out: should still animate in the swipe direction.

Why this will work
- It removes the major conflicting overrides that currently force bottom offset and extreme z-index.
- It targets Sonner’s real exit condition (data-removed="true"), not a Radix-like state attribute.
- It neutralizes Sonner’s “exit translation” by overriding the exact selectors that set --y during removal, while preserving normal stacking transforms.

Files to change
- src/index.css
  - Remove mobile bottom override for [data-sonner-toaster]
  - Replace z-index: 99999 rule with z-index: 40 (or below nav)
  - Replace incorrect data-state overrides with correct data-removed overrides
- src/components/ui/sonner.tsx
  - Remove data-[state=closed] Tailwind exit classes that don’t apply to Sonner

Edge cases / tradeoffs
- Sonner’s default “lift/stack” transform behavior will remain for normal stacking; we’re only preventing the specific “removed moves out” behavior. This should keep layout stable while eliminating the exit flight.
- If you prefer absolutely zero transform animation ever (even when stacking), we can also globally set transition-property to opacity for all toasts, but that will remove stack smoothing. I’m not proposing that first because it can make stacked updates look jumpy; the above is the best balance.

After implementing, if you still see movement:
- We’ll inspect which attributes are present at runtime (data-removed, data-visible, data-mounted, etc.) and adjust the override selectors accordingly. Sonner’s CSS is attribute-driven, so matching the correct attributes is key.
