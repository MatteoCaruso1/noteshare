

## Bug Analysis

The `-` → `•` bullet auto-conversion in `RichTextarea.tsx` (line 281–291) does **not** preserve scroll position, unlike the `[]` → `☐` checkbox conversion (line 262–278) which properly uses `focusWithoutScroll` + `restoreScrollNextFrame`.

When the folder description textarea auto-expands after the bullet transform, the browser's caret-following heuristic scrolls the page down (Frame 1), and then the auto-expand effect momentarily collapses the textarea to `0px` height, causing a layout reflow that can trigger a brief overlay/darkening artifact (Frame 2).

## Fix

Apply the same scroll-preservation pattern already used for checkbox conversion to the bullet conversion paths:

**`src/components/RichTextarea.tsx`** — two changes:

1. **`-` → `•` conversion (lines 280–291):** Before calling `onChange`, capture scroll position via `getScrollContainerFor` / `getScrollTop`. In the `setTimeout`, use `focusWithoutScroll` + `restoreScrollNextFrame` instead of raw cursor assignment.

2. **`.- ` → `•` shortcut (lines 293–303):** Same treatment — save scroll, restore after transform.

Both will mirror the existing pattern at lines 263–277:
```ts
const scrollContainer = getScrollContainerFor(textarea);
const savedScrollTop = getScrollTop(scrollContainer);
// ... onChange(transformed) ...
setTimeout(() => {
  focusWithoutScroll(textarea);
  textarea.setSelectionRange(newCursor, newCursor);
  restoreScrollNextFrame(scrollContainer, savedScrollTop);
}, 0);
```

No new files, no new dependencies, no new queries. Two surgical edits within `handleInput`.

