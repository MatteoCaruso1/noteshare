
Problem found: this is very likely not a z-index issue. The floating emoji animation is currently self-canceling off-screen.

What I found:
- `FloatingInstruments` is mounted globally in `App.tsx`, so it is rendering.
- The animation class `animate-float-down` exists in `tailwind.config.ts`.
- But each emoji is also given `top: '-120vh'` in inline styles.
- The keyframe itself already starts at `transform: translateY(-120vh)` and ends at `translateY(105vh)`.

Why that breaks visibility:
```text
Base position:      top = -120vh
Animation start:    translateY(-120vh)
Visible result:     starts around -240vh

Animation end:      top = -120vh + translateY(105vh)
Visible result:     ends around -15vh
```

So the emojis never actually enter the viewport. They stay above the screen the entire time inside an `overflow-hidden` fixed container.

Implementation plan:
1. Fix the animation math in `src/components/FloatingInstruments.tsx`
   - Remove the inline `top: '-120vh'`.
   - Anchor each emoji from the top of the container with `top: 0`.
   - Let the keyframe alone control the full vertical travel.
   - Keep `animationDelay` and `animationDuration`.

2. Make the effect more robust and visible
   - Slightly increase opacity from the current very faint value so it remains visible over the newer ambient background.
   - Keep `pointer-events-none`.
   - Keep the fixed full-screen container and current z-index unless testing later proves another conflict.

3. Restore the intended placement pattern
   - Constrain emojis to left/right gutter regions instead of randomizing across the full width.
   - This matches the existing ambient design memory and avoids interfering with central content.
   - Use deterministic-ish spread so they do not cluster badly.

4. Verify both page contexts conceptually
   - Landing page: should appear alongside `WelcomeHero` decorations.
   - Logged-in pages: should appear behind/around core cards without competing with content.

Files to change:
- `src/components/FloatingInstruments.tsx` — primary fix
- Possibly `tailwind.config.ts` only if I decide to slightly tune the keyframe travel range, but most likely not needed

Expected result:
- Emojis will actually traverse through the viewport.
- They will be visible again on both landing and regular pages.
- The effect will be subtle but clearly present, especially in the side gutters.
