
Goal
- Remove the “weird dark box” outline that appears around Card UI during route transitions while a practice session is active.
- Make the visual transition feel smooth without sacrificing the “content slides behind bars” vibe.

What I found (why the last glow tweak didn’t help)
- The glow you changed is applied via box-shadow on `.session-focus-card` children.
- Your page transitions use `filter: blur(2px)` on `.page-body` (see `PageBody` in `src/components/PageLayout.tsx`).
- When an element (or an ancestor) is being filtered/blurred, browsers often rasterize it into an offscreen texture. Any box-shadow + blur combo can produce a rectangular “texture bounds” artifact (it looks like a dark box/halo rectangle) during the opacity/blur animation.
- So changing the shadow values alone can be too subtle to fix the root cause: the artifact is mostly coming from “blurred layer compositing”, not the exact shadow color.

Additionally important
- Right now, `body.session-active` is only controlled by `SessionFocusOverlay` rendered inside `Index.tsx`’s `GlintProvider`. That means session focus styling can “drop” or change across route transitions, making the compositing artifact worse (class toggles while transitions are running). Making session-active truly global will reduce visual discontinuities.

Plan (what I’m going to change)

1) Make “session-active” a global app state (stable across route transitions)
- Update `src/components/SessionFocusOverlay.tsx` so it does NOT rely on `GlintContext`.
  - Instead, it will read the authenticated profile and active session directly (via `useAuth()` and `useActiveSession(profile?.id)`).
  - It will add/remove `body.session-active` based on the real session state.
- Render `SessionFocusOverlay` once globally in `src/App.tsx` (inside auth provider), so:
  - The class stays consistent no matter what page you navigate to.
  - Focus mode doesn’t “blink” on transitions.

Why this helps the box artifact
- Fewer rapid style toggles (background, filters, borders, shadows) during route transitions reduces the chance of weird intermediate compositing frames.

2) Remove blur-based route transitions during active session (keep opacity-only)
- Update `src/components/PageLayout.tsx` (`PageBody`) so that when a practice session is active, it uses opacity-only transitions (no `filter: blur(...)`).
  - We can detect session-active either by:
    - Reading `document.body.classList.contains('session-active')`, or preferably
    - Consuming the same active session hook/context used by the global overlay (cleaner, but requires plumbing).
- The end result: during session-active, the page transition remains smooth, but avoids the GPU rasterization edge-case that creates the dark rectangle.

Why this is likely the real fix
- The “dark box” looks exactly like a filtered layer’s bounding box. Eliminating the blur filter in that state removes the main trigger.

3) Change glow implementation to avoid box-shadow artifacts during transitions
Even after removing blur transitions during session-active, I’ll also make glow more “transition-safe”:
- In `src/index.css`, change the focused-card glow from box-shadow on the card itself to a pseudo-element glow:
  - Add `position: relative` (already), then for session-active:
    - `.session-focus-card::before` as an absolutely-positioned element with:
      - `inset: -10px` (slightly larger than card)
      - `border-radius: inherit` (or match the card’s radius)
      - `background: radial-gradient(...)`
      - `opacity` transition
      - `filter: blur(...)` (on the pseudo element, not the whole page)
      - `pointer-events: none`
      - `z-index: -1` while keeping `.session-focus-card` isolated
- Reduce reliance on heavy shadows on the real card element; keep a minimal shadow for depth but let the pseudo-element do the “glow”.

Why this helps
- Pseudo-element glows blend more gracefully and are less likely to show “hard rectangle edges” than large box-shadow stacks during animated state changes.

4) Verify and tune with an end-to-end reproduction
In the preview:
- Start a practice session.
- Navigate rapidly between pages that contain Cards (Practice → Profile → Projects → back).
- Confirm:
  - No dark-box outline appears during the transition.
  - The glow still reads as “focused” and premium, but not harsh.
  - Header/footer border enhancements still look good.

If the artifact still appears (fallback measures)
- Apply `contain: paint;` selectively to the page body or to card containers during session-active to constrain paint/raster behavior.
- Ensure elements with transforms (e.g., BottomNav uses `translate3d`) don’t create unexpected stacking contexts interacting with filters; if needed, bump isolation/containment for `.page-body` only during session-active.

Files I will modify
- src/components/SessionFocusOverlay.tsx
  - Make it derive active session state directly; remove GlintContext dependency.
- src/App.tsx
  - Render SessionFocusOverlay globally (so class persists across pages).
- src/components/PageLayout.tsx
  - During session-active, use opacity-only transitions (remove blur filter).
- src/index.css
  - Move glow to `.session-focus-card::before` (pseudo-element glow), simplify box-shadow.

Acceptance criteria (what “fixed” means)
- While a session is active, route transitions do not show a rectangular dark outline around cards.
- The focused practice cards still feel elevated (glow preserved), but transitions look clean.
- No regressions: toasts remain above the bottom nav; nav borders still visible.

Test checklist for you (after I implement)
- Start session → navigate Practice ⇄ Profile 5–10 times quickly.
- Scroll a bit, then navigate again (to test “content behind bars” feel).
- Confirm on mobile-sized viewport (iPhone size) and desktop if possible.
