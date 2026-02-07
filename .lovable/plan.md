
## Plan: Fix Dark Box Artifact and Re-Add Focus Card Glow

### Problem Analysis

The "dark box" artifact around Card UI elements during page transitions in practice session state is **NOT caused by the glow effect** - it's caused by the combination of:

1. **Brightness filter on sections**: `filter: brightness(0.35) saturate(0.8)` applied to `main > section` and `.page-body > section` elements during `body.session-active` state (lines 947-950 of `index.css`)

2. **Page transitions with opacity**: When navigating between pages, the `PageBody` component fades content in/out with opacity transitions. When an element has a `filter` property AND undergoes opacity transitions, browsers rasterize the filtered layer to a GPU texture - this creates a visible rectangular boundary (the "dark box")

3. **Non-focus sections get filtered**: On pages like Profile, the cards are NOT wrapped in `.session-focus-card`, so they receive the brightness filter. The boundary of this filtered section becomes visible during transitions

### Solution

Replace the brightness filter approach with an opacity-based dimming that doesn't trigger GPU rasterization artifacts:

**1. Change section dimming from `filter: brightness()` to `opacity`**
- Remove `filter: brightness(0.35) saturate(0.8)` from section styling
- Use `opacity: 0.35` instead for non-focused sections
- Opacity changes are handled more gracefully by browsers during compositing

**2. Re-add the glow effect for focus cards**
- Re-introduce the `::before` pseudo-element glow on `.session-focus-card`
- Use a subtle teal/primary color radial gradient
- Keep the blur contained to the pseudo-element (not the page)

**3. Add `will-change: opacity` for sections undergoing transitions**
- Helps browser optimize the opacity transition
- Prevents unexpected layer creation during route changes

### Technical Changes

#### File: `src/index.css`

**Lines 944-960 (section dimming):**
```css
/* BEFORE - causes dark box artifact */
body.session-active main > section,
body.session-active .page-body > section {
  filter: brightness(0.35) saturate(0.8);
}

/* AFTER - opacity-based dimming */
body.session-active main > section,
body.session-active .page-body > section {
  opacity: 0.35;
}
```

**Lines 922-930 (focus card glow - re-add):**
```css
/* Subtle glow effect for focused cards during session */
body.session-active .session-focus-card::before {
  content: '';
  position: absolute;
  inset: -8px;
  border-radius: inherit;
  background: radial-gradient(
    ellipse at center,
    hsl(var(--primary) / 0.15) 0%,
    hsl(var(--primary) / 0.05) 50%,
    transparent 70%
  );
  pointer-events: none;
  z-index: -1;
  opacity: 0;
  transition: opacity var(--focus-transition);
}

body.session-active .session-focus-card::before {
  opacity: 1;
}
```

**Lines 936-942 (section transitions):**
```css
/* Add will-change for smoother transitions */
section,
[data-tour="timeline"] {
  transition: opacity var(--focus-transition);
  will-change: opacity;
}
```

### Why This Fixes the Issue

1. **No filter = no rasterization boundary**: Opacity changes don't create the same GPU texture boundaries that filter operations do

2. **Glow on pseudo-element is isolated**: The `::before` glow has its own stacking context and blur is contained to that element only

3. **Consistent brightness perception**: While technically different, `opacity: 0.35` creates a similar visual dimming effect to `brightness(0.35)` against a dark background

### Visual Behavior After Fix

- Non-focused content dims to 35% opacity during active session (similar visual effect)
- Focus cards remain at full opacity with a subtle teal glow
- Page transitions no longer show dark box outlines around cards
- Header and nav border enhancements remain unchanged

### Files to Modify

| File | Changes |
|------|---------|
| `src/index.css` | Replace brightness filter with opacity; re-add glow pseudo-element |
