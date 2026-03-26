
Goal: fix the authenticated practice page so the subtle left/right musical decorations are actually perceptible on desktop, and the falling emojis are reliably visible instead of depending on lucky timing/placement.

What I found
- The existing code is already rendering both layers:
  - global falling emojis in `src/components/FloatingInstruments.tsx`
  - desktop side decorations in `src/pages/Index.tsx`
- The main issue is not a missing component anymore. It is a visibility/design problem:
  1. The side symbols are extremely faint (`opacity-[0.03]` / `0.04`) and pushed almost flush to the screen edge, so on a dark desktop page they are effectively invisible.
  2. The falling emojis have very long staggered delays (`(i * 3) + random up to 8`), so many won’t appear for several seconds after load.
  3. The emojis are distributed across the whole viewport, not intentionally on the left/right margins, so many pass behind the central content column where they are hard to notice.
  4. Their opacity is also very low (`0.05`), which compounds the issue.

Implementation plan
1. Make the side decorations intentionally visible on desktop
- Keep them subtle, but increase visibility modestly:
  - bump opacity into a still-soft but readable range
  - enlarge a few symbols slightly
  - pull them a bit farther inward from the page edge
- Keep them desktop-only and non-interactive.
- Keep them outside the main content flow so layout does not change.

2. Rework the emoji background to behave like side ambience, not random confetti
- Update `FloatingInstruments.tsx` so emoji positions are biased to left and right “gutters” instead of the middle content column.
- Reduce initial delays so users see motion almost immediately after page load.
- Keep randomization, but constrain it so the effect is dependable rather than accidental.
- Slightly increase opacity/size only enough to read on the dark background.

3. Prevent the background from competing with content
- Maintain very low contrast and keep all elements behind core UI interaction.
- Avoid placing decorative elements inside the center reading area.
- Preserve current header/bottom-nav behavior and all page functionality.

4. Verify against the actual failure mode
- Check desktop authenticated `/` specifically, since that is where the issue occurs.
- Confirm:
  - side decorations are visible on both left and right at first glance
  - at least some falling emojis are visible immediately
  - emojis continue to animate behind the page without crossing attention-grabbing levels
  - no layout shift or overlap with the main cards

Files to update
- `src/components/FloatingInstruments.tsx`
- `src/pages/Index.tsx`

Technical notes
- I do not think another z-index increase is the right fix; the current evidence points to “present but imperceptible,” not “missing from DOM.”
- The robust fix is to make the decorative system deterministic enough for real users:
  - visible side gutters
  - shorter animation startup
  - less center-column overlap
  - slightly stronger but still restrained opacity
