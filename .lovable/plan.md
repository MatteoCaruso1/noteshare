
# Plan: Fix Global Scroll Lock Issue

## Problem Identified

The scroll lock issue is caused by **nested Sheet/Dialog components** in the Groups feature that were recently modified. Specifically:

1. **`EventDetailSheet`** (in GroupDetail.tsx, lines 554-627) contains a nested `ShareEventSheet` that opens via `setShowShare(true)` **without closing the parent sheet first**
2. When the user opens the Share Event sheet from within the Event Detail sheet, **two Radix modals are open simultaneously**
3. When one sheet closes but the other remains open, Radix's scroll locking mechanism gets confused and may leave the `data-scroll-locked` attribute or `overflow: hidden` on the body/html

This pattern differs from the working `EventSuccessDialog` which properly closes itself (`onOpenChange(false)`) BEFORE opening the share sheet.

## Solution

### Fix 1: Update `EventDetailSheet` to close before opening ShareEventSheet

In `src/pages/GroupDetail.tsx`, modify the `EventDetailSheet` component's share button handler to close the parent sheet before opening the share sheet:

```text
Current (line 619):
  onClick={() => setShowShare(true)}

Fixed:
  onClick={() => {
    onOpenChange(false);  // Close parent sheet first
    setTimeout(() => setShowShare(true), 100);  // Open share sheet after animation
  }}
```

### Fix 2: Add `modal={false}` to nested sheets as a safety measure

If the share sheet is meant to be used both standalone and nested, adding `modal={false}` to the Sheet components in `ShareGroupSheet.tsx` and `ShareEventSheet.tsx` will prevent them from managing scroll lock independently when used in a nested context:

```tsx
<Sheet open={open} onOpenChange={onOpenChange} modal={false}>
```

However, this may have side effects (no overlay, no escape-to-close). The recommended approach is Fix 1.

### Fix 3: Ensure cleanup on sheet close

Add cleanup logic to handle the edge case where scroll locks persist. This can be done by adding `onOpenChange` wrappers that clear scroll locks when sheets close.

---

## Technical Details

### Files to Modify

1. **`src/pages/GroupDetail.tsx`** - Fix the `EventDetailSheet` component to close before opening `ShareEventSheet`

### Why This Happened

The recent changes to `ShareGroupSheet.tsx` and `ShareEventSheet.tsx` added:
- Desktop sharing support ("Save Image" button)
- Editable description textareas
- `useEffect` for avatar base64 conversion

While these changes themselves don't directly cause scroll locking, they increased usage of these sheets, and the nested sheet pattern in `EventDetailSheet` (which may have existed before) became problematic when users started using the share functionality more frequently.

### Testing

After the fix:
1. Open a group detail page
2. Click on an event to open the Event Detail sheet
3. Click "Share Event" - the parent sheet should close, then the Share Event sheet should open
4. Close the Share Event sheet - scrolling should work normally
5. Navigate to the landing page - scrolling should work normally
6. Test on iOS device to confirm the fix works on mobile Safari
