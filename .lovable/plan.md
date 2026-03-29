

## Fix: Filter buttons disappearing on mobile touch

### Problem
The time-range filter buttons (1M, 2M, 3M, 6M, All) on Practice Time and Focus Level charts disappear momentarily when tapped on mobile. The current fix uses `active:` pseudo-classes but is missing the crucial `onTouchEnd` blur handler that solved the identical issue on the Groups tabs.

### Root cause
On mobile Safari, after a touch event the `:active` / `:focus` state can stick, causing visual artifacts. The working fix in `TabsTrigger` (src/components/ui/tabs.tsx line 40) calls `e.currentTarget.blur()` on `onTouchEnd` to immediately release the stuck state.

### Fix (1 file)
**`src/components/PracticeStats.tsx`** — Add `onTouchEnd={(e) => { e.currentTarget.blur(); }}` to both sets of filter buttons (Practice Time ~line 273 and Focus Level ~line 693).

This matches the exact pattern that fixed the Groups tab buttons.

