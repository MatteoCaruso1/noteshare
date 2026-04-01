
Goal: make the stats graph filter pills (1M, 2M, 3M, 6M, All) stay visually stable on mobile tap, even after app publishes/refreshes, and align them with the working mobile-safe button patterns already used elsewhere.

What I found
- The Practice Stats range pills are still hand-rolled plain `<button>` elements in `src/components/PracticeStats.tsx` for both:
  - Practice Time range selector
  - Focus Level range selector
- Those buttons currently only have:
  - `touch-manipulation`
  - `onTouchEnd -> blur()`
  - active/inactive Tailwind classes
- They do not use the stronger patterns that the working controls use:
  - `data-no-hover-reset`
  - `aria-pressed`
  - shared `Button` styling or Radix-style selected-state semantics
  - pointer-up cleanup
  - stronger selected-state specificity

Why the old fix hasn’t worked
- The previous fixes addressed other button families, but these stats pills were left on a separate custom implementation.
- On mobile, there is a global CSS rule in `src/index.css` that resets hover background on touch devices for buttons unless they are:
  - `[aria-pressed="true"]`
  - `[data-no-hover-reset]`
- The stats pills have neither of those protections.
- iOS/Safari can keep a tapped button in a sticky `:hover`/focus-like visual state briefly. Since these pills are custom and state changes happen immediately on tap, the global touch hover reset can end up wiping the visual background of the selected pill, which is why it looks like it “disappears”.
- In contrast, working controls like the unlock button / metronome / timer / tabs use stronger state semantics and protection against the mobile hover reset behavior.

What makes this UI different from the working buttons
- Stats pills:
  - plain custom buttons
  - no selected semantics (`aria-pressed`)
  - no `data-no-hover-reset`
  - selected/inactive styling mixed in ad hoc strings
  - no pointer-up cleanup
- Working buttons:
  - use shared `Button` component or Radix triggers/tabs
  - often include `data-no-hover-reset`
  - often include selected-state attributes (`aria-pressed` or `data-state=active`)
  - blur on interaction end, sometimes on both touch and pointer
  - selected-state classes are designed to persist through mobile tap states

Implementation plan
1. Replace both stats range button groups with one shared reusable range-pill renderer inside `PracticeStats`
- Create a small internal helper/component for the range pills so both charts use the exact same implementation.
- This removes the chance that one graph gets fixed while the other keeps the bug.

2. Give each pill explicit selected-state semantics
- Add `aria-pressed={isActive}` to each pill.
- Add `data-no-hover-reset` so the global mobile hover reset never strips the background from these controls.
- This directly addresses the CSS/system-level cause.

3. Migrate the pills onto the project’s proven mobile-safe button pattern
- Prefer using the shared `Button` component with explicit class overrides for pill appearance, or a local button styled to match `Button` behavior exactly.
- Include:
  - `touch-manipulation`
  - `select-none`
  - `[-webkit-tap-highlight-color:transparent]`
  - `onTouchEnd` blur
  - `onPointerUp` blur
- Keep the currently compact rounded-pill visual design.

4. Strengthen the active/inactive visual states so mobile cannot “wash them out”
- Active state should explicitly keep its background/text on tap:
  - dark/solid selected background
  - stable selected text color
  - explicit active-state classes matching the selected visual
- Inactive state should have its own explicit background/text and only hover on hover-capable devices.
- Use `[@media(hover:hover)]` gated hover classes instead of generic `hover:*` on these pills.

5. If needed, use a stable selected-state hook/class rather than relying on pseudo-classes
- If the shared Button base still isn’t enough, add a tiny dedicated `StatsRangePill` component with deterministic selected styles and no dependence on transient hover state.
- This would mirror the “robust over clever” approach used in the historical mobile fixes.

Files to update
- `src/components/PracticeStats.tsx`
  - replace both range button groups with the shared robust implementation
- Possibly no global CSS change needed if the per-button protections are added correctly
- Only if necessary, a very small targeted CSS helper in `src/index.css` for stats pill selected state on touch devices

Expected result
- On mobile, tapping 1M/2M/3M/6M/All will no longer make the pill visually disappear.
- The selected pill will remain visibly selected immediately after tap.
- Both charts will behave identically.
- The implementation will match the stronger interaction model already used by the app’s working mobile-safe controls.

Technical details
```text
Current root cause:
custom stats button
  -> no aria-pressed
  -> no data-no-hover-reset
  -> mobile touch hover-reset CSS can override visual state
  -> tapped selected pill appears to vanish

Planned robust fix:
shared stats pill
  -> aria-pressed={isActive}
  -> data-no-hover-reset
  -> touch + pointer blur cleanup
  -> hover only on hover-capable devices
  -> explicit active selected styling
```
