
## What’s happening (root cause)
Yes — we’re editing the right toaster file (`src/components/ui/sonner.tsx`), but the app’s global CSS is overriding the toast z-index with `!important`, forcing Sonner (and Radix) toasts to sit at `z-index: 40`, which is below the bottom nav (`z-50`).

In `src/index.css`:
```css
[data-sonner-toaster],
.toaster,
[data-radix-toast-viewport] {
  position: fixed !important;
  z-index: 40 !important; /* This defeats inline zIndex: 60 */
}
```

So even though `sonner.tsx` sets `zIndex: 60`, it cannot win against `z-index: 40 !important`.

This matches your screenshot: the toast is “under” the nav (stacking context), not necessarily “too low” (offset).

## Goal
During an active practice session, toasts should appear above the bottom nav (both stacked above it and positioned with enough bottom offset).

## Implementation approach
### 1) Fix the z-index override to allow “above nav during practice”
Update `src/index.css` so:
- Default behavior can stay “below nav” if you still want that outside practice.
- During practice session state (`body.session-active`), bump toast z-index above nav.

Planned CSS change:
- Keep base rule at z-index 40 (or raise it globally if you decide to always show above nav).
- Add a more specific session rule:
```css
body.session-active [data-sonner-toaster],
body.session-active .toaster,
body.session-active [data-radix-toast-viewport] {
  z-index: 60 !important;
}
```

Why this works:
- Same `!important` level, but more specific selector wins.
- It uses the existing “practice session” body class your app already applies.

### 2) Keep / verify bottom offset logic in Sonner
Your `src/components/ui/sonner.tsx` already computes:
- `calc(92px + env(safe-area-inset-bottom))` normally
- `calc(112px + env(safe-area-inset-bottom))` during practice

We’ll keep this, but after the z-index fix, it should finally be visible above the nav.

Optional refinement (if needed after the z-index fix):
- Increase those numbers slightly if the nav is taller on certain devices (especially iOS with safe-area + extra padding). We’ll only do this if it still overlaps after layering is corrected.

### 3) Confirm we’re not seeing a different toaster
`src/App.tsx` renders **two** toasters:
- `src/components/ui/toaster.tsx` (Radix/shadcn toast)
- `src/components/ui/sonner.tsx` (Sonner)

Most of your code calls `toast` from `sonner`, so Sonner is the one that matters, but we’ll update CSS in a way that also covers Radix’s viewport to prevent the same problem there.

## Files to change
1) `src/index.css`
- Adjust the “TOAST LAYERING” section:
  - keep base z-index
  - add `body.session-active ... { z-index: 60 !important; }`

(We likely won’t need to change `src/components/ui/sonner.tsx` beyond what’s already there, but we’ll confirm after CSS is fixed.)

## Testing checklist (what you should do right after)
1) Start a practice session (so `body.session-active` is applied).
2) Trigger any toast.
3) Confirm:
   - Toast is visually on top of the bottom nav (not behind it).
   - Toast remains above nav when the keyboard opens/closes (BottomNav transforms).
4) Repeat not in a practice session (optional):
   - Confirm whether you still want toasts below nav outside practice. If you decide you always want them above, we’ll simplify CSS to use z-index 60 globally.

## If it still fails after this
We’ll inspect the computed styles in-browser:
- Check `[data-sonner-toaster]` computed `z-index`
- Check if some parent stacking context / transform is causing unexpected stacking behavior
- Verify `body.session-active` is actually present when you think practice is active
