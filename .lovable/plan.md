

## Fix: Invisible Loading Skeletons on Both Timelines

### Root Cause

Both `NoteCardSkeleton` and `FriendNoteCardSkeleton` (in `FriendsFeedSkeleton.tsx`) use `animate-fade-in opacity-0` with `animationFillMode: 'forwards'`. However, **the `animate-fade-in` animation class does not exist** in the Tailwind config (`tailwind.config.ts`). The config only defines `fade-in-slow`, not `fade-in`.

Since the skeletons start at `opacity-0` and the animation that should fade them to `opacity-1` never runs, the skeleton cards are permanently invisible on both pages. They are in the DOM and taking up space, but you can't see them.

### Fix

Add a `fade-in` keyframe and `animate-fade-in` animation to `tailwind.config.ts`:

**File: `tailwind.config.ts`**

1. Add a new `fade-in` keyframe (alongside the existing `fade-in-slow`):
   - `'fade-in': { '0%': { opacity: '0' }, '100%': { opacity: '1' } }`

2. Add the corresponding animation utility:
   - `'fade-in': 'fade-in 0.3s ease-out forwards'`

This is a faster variant of the existing `fade-in-slow` (0.3s vs 0.6s), which is appropriate for skeleton stagger animations that use 60-80ms delays between cards.

### Result

After this one change, both the Practice page and Friends page timelines will show visible pulsing skeleton cards during loading, with the staggered cascade animation working as originally intended.

### Summary

| File | Change |
|------|--------|
| `tailwind.config.ts` | Add `fade-in` keyframe + `animate-fade-in` animation (2 lines) |

