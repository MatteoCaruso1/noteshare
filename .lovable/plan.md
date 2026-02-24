

## Fix: Applause Footer Layout Shift on My Practice Page

### Problem

When notes load on the My Practice page, the `ApplauseFooter` immediately shows a "Loading..." placeholder with a fixed height. Once the applause query resolves and finds zero applause (the common case for your own notes), the footer disappears, causing the note card to visibly shrink. This creates a jarring "bounce" effect across every note in the timeline.

### Solution

Flip the default assumption: start with the footer hidden (zero height), then if applause data comes back with actual results, smoothly animate the footer open.

### Changes

**File: `src/components/ApplauseFooter.tsx`**

1. **Remove the loading placeholder entirely** -- instead of showing "Loading..." with reserved height, return `null` while `isLoading` is true (same as "no applause" state). This means notes start at their compact size.

2. **Add a smooth expand animation** when applause data arrives. Wrap the footer content in a container that uses CSS `grid-template-rows` transition (the modern way to animate height from 0 to auto):
   - When applause count is 0 and it's the owner's note: `grid-template-rows: 0fr` (collapsed, hidden)
   - When applause exists: `grid-template-rows: 1fr` (expanded, visible)
   - Transition: ~300ms ease-out for a smooth, unhurried reveal

3. The inner content div gets `overflow: hidden` so it clips during the height transition.

### How It Works

```text
Note loads -> Footer hidden (no space taken)
                 |
         Applause query runs in background
                 |
        +--------+--------+
        |                 |
  No applause        Has applause
  (stay hidden)    (animate open ~300ms)
```

### Result

- **Common case (own notes, no applause)**: Note renders at final size immediately. No shrink.
- **Has applause**: Footer smoothly slides down to reveal applause info.
- Comments still show immediately if `comment_count > 0` (this is available from the note data, no async needed).

### Summary

| File | Change |
|------|--------|
| `src/components/ApplauseFooter.tsx` | Remove loading placeholder, add CSS grid height animation for smooth reveal |
