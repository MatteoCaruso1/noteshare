
Goal: Fix regular (shadcn/Radix) toasts appearing underneath the persistent BottomNav, while keeping Pro-feature (Sonner) toasts behaving correctly.

What’s happening (why Pro toasts are fine but regular aren’t)
- You have two toast systems mounted in `src/App.tsx`:
  1) Sonner: `src/components/ui/sonner.tsx` (what you’re calling “pro feature toast”)
     - It already computes a dynamic `mobileOffset` (92px or 112px + safe-area) so the toast sits above the BottomNav and (when active) the session UI.
  2) Radix/shadcn: `src/components/ui/toaster.tsx` + `src/components/ui/toast.tsx` (what you’re calling “regular toast”)
     - On mobile it only uses `bottom-20` (80px). That’s not enough clearance once your BottomNav has extra padding for safe-area + the larger session UI state. Result: the toast is rendered “behind/under” the nav visually (it’s actually just positioned too low).

Additionally, `src/index.css` contains a global “TOAST LAYERING” rule that forces `[data-sonner-toaster], .toaster, [data-radix-toast-viewport] { z-index: 60 !important; }`.
- This doesn’t currently explain the “under nav” symptom (because 60 > 50), but it is risky because it overrides the inline zIndex you set in Sonner (`9999`) and could become a problem if any other overlay/nav layer changes.
- We’ll make the layering rule consistent with your intended “always above everything” behavior.

Implementation plan (code changes)

1) Make Radix/shadcn toasts use the same bottom clearance logic as Sonner
Files:
- `src/components/ui/toaster.tsx`

Changes:
- Import `useAuth` and `useActiveSession` (same pattern as Sonner).
- Compute `isPracticeActive` and a `mobileBottomOffset`:
  - inactive: `calc(92px + env(safe-area-inset-bottom, 0px))`
  - active: `calc(112px + env(safe-area-inset-bottom, 0px))`
- Replace the current `bottom-20` with an arbitrary Tailwind bottom calc that matches the computed state. Example approach:
  - When `isMobile` and session inactive: `bottom-[calc(92px+env(safe-area-inset-bottom,0px))]`
  - When `isMobile` and session active: `bottom-[calc(112px+env(safe-area-inset-bottom,0px))]`
- Also add `top-auto` on mobile so the viewport doesn’t stretch top-to-bottom unnecessarily (optional but makes the CSS easier to reason about).

Why this fixes it:
- The toast viewport’s “bottom edge” will be lifted above the nav by the correct amount in both “normal” and “practice session active” states, matching what already works for Sonner.

2) Stop `src/index.css` from downgrading toast z-index back to 60
Files:
- `src/index.css`

Changes:
- Update the “TOAST LAYERING” block to set z-index to a truly “always on top” value (e.g. `9999`) for:
  - `[data-sonner-toaster]`
  - `.toaster`
  - `[data-radix-toast-viewport]`
- Keep `position: fixed !important;` if it’s helping across browsers, but ensure the z-index matches the intended stacking behavior.

Why do this if position is the main problem:
- It aligns the global CSS with your newer intent (you already tried 9999 inline for Sonner).
- It prevents future regressions where a component gains a higher z-index than 60 (dialogs, drawers, nav variants, etc.).

3) Verify which toast API is used where (sanity check)
Files:
- `src/hooks/use-toast.ts` (Radix/shadcn)
- Search for `toast(` imports to see which “toast” function is being called in “regular” cases:
  - `import { toast } from "sonner"` versus `import { toast } from "@/hooks/use-toast"`

Outcome:
- Confirm the “regular toast” in your screenshot is the Radix/shadcn toaster and not a Sonner toast with different styling.
- If any “regular” actions are using shadcn toast, they will benefit immediately from the corrected bottom offset.

4) Manual test checklist (desktop + mobile)
- Mobile (or narrow viewport):
  - Trigger a “regular” toast (shadcn) while BottomNav is visible; confirm it appears above the nav.
  - Start an active practice session state and trigger the same toast; confirm it clears the larger bottom UI.
  - Trigger Sonner toasts too; confirm unchanged behavior.
- Desktop:
  - Confirm shadcn toast placement still looks reasonable (likely top-right/viewport per existing design).
- Regression:
  - Confirm the session focus dimming rules still don’t affect toasts (you already have exemptions; we won’t change those).

Notes / edge cases considered
- Safe-area inset: included in the calc so iOS home-indicator devices don’t clip the toast.
- Keyboard-open behavior: BottomNav slides away on mobile keyboard; with the new bottom offset, toasts will still be safely visible, and may simply appear a bit higher (acceptable).
- Because `src/index.css` currently has `z-index: 60 !important`, changing it to `9999` is the cleanest way to ensure both systems behave consistently.

Files expected to change
- `src/components/ui/toaster.tsx` (primary fix: correct bottom offset logic for Radix/shadcn toasts)
- `src/index.css` (supporting fix: raise forced toast z-index to match intended “always above nav” behavior)

Success criteria
- Regular (shadcn/Radix) toast never visually sits underneath the BottomNav in either normal or active-practice-session states, even after refresh.
- Pro-feature (Sonner) toast remains correct and unchanged.
