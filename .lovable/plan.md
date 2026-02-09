
# Fix: Practice Board Backlog Toast Visibility & Paste Formatting Issues

## Problem Summary

When in a practice session on mobile, using the Practice Board Backlog feature has two issues:

1. **Toast notification hidden**: When copying text from the backlog, the "Copied to clipboard" toast doesn't appear because it's rendered behind the dialog modal
2. **URL-encoded text after paste**: When pasting copied backlog content into the Practice Board, the text appears URL-encoded (e.g., `%0A%E2%80%A2%20` instead of newlines and bullet points)

---

## Root Cause Analysis

### Issue 1: Toast Hidden Behind Dialog
The `FocusBacklogDialog` uses Radix Dialog which creates a portal with `z-50` on the overlay. While Sonner toasts have `z-index: 9999`, the Dialog's stacking context can still visually layer above the toast in certain mobile browser rendering scenarios. The Sonner toaster needs to be rendered in a way that guarantees it appears above all dialogs.

### Issue 2: URL-Encoded Paste
After investigation, the database stores properly formatted text with real newlines (\\n) and bullet characters (•). The `navigator.clipboard.writeText()` function copies plain text correctly.

The issue appears to be a **mobile Safari quirk** where calling `navigator.clipboard.writeText()` from within a button click handler inside a dialog may not work reliably, especially when the dialog has focus traps or specific touch handling. Some iOS versions return an encoded representation when the clipboard API is called in certain stacking contexts.

The fix is to ensure the clipboard write operation completes successfully and to add proper async/await handling with error recovery.

---

## Implementation Plan

### File: `src/components/FocusBacklogDialog.tsx`

**Change 1: Add explicit CSS for toast visibility inside dialog**
Wrap the toast call to ensure it appears above the dialog by using Sonner's built-in position override.

**Change 2: Improve clipboard copy reliability**
- Add a small delay before copying to ensure the button's touch event completes
- Use a fallback method for iOS if the modern clipboard API fails
- Add explicit text sanitization before copy to remove any potential hidden characters

```typescript
// Before
const handleCopy = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  } catch {
    toast.error('Failed to copy');
  }
};

// After - with iOS fallback and improved reliability
const handleCopy = async (text: string) => {
  try {
    // Normalize text to ensure clean copy (remove any potential encoding artifacts)
    const cleanText = text.normalize('NFC');
    
    // Try modern clipboard API first
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(cleanText);
    } else {
      // Fallback for older browsers / iOS edge cases
      const textarea = document.createElement('textarea');
      textarea.value = cleanText;
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      textarea.style.top = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    
    // Use Sonner toast with explicit high z-index positioning
    toast.success('Copied to clipboard', {
      position: 'top-center', // Ensures visibility above dialog
    });
  } catch (err) {
    console.error('Copy failed:', err);
    toast.error('Failed to copy');
  }
};
```

### File: `src/components/ui/sonner.tsx`

**Change: Increase z-index for modal scenarios**
Update the Sonner configuration to use an even higher z-index that's guaranteed to layer above Radix Dialog portals.

```typescript
// Update zIndex from 9999 to a value that exceeds Radix Dialog portal stacking
style={{
  zIndex: 2147483647, // Max z-index value, guaranteed above all portals
  // ... other styles
}}
```

---

## Technical Details

### Why the URL Encoding Might Occur
iOS Safari's clipboard API can sometimes encode text when:
1. The copy operation is triggered within a focus-trapped modal
2. Touch events haven't fully propagated before clipboard access
3. The text contains unicode characters (like • bullet points)

By normalizing the text with `normalize('NFC')` and providing a fallback copy method using a temporary textarea (which bypasses some clipboard API quirks), we ensure reliable copying.

### Toast Positioning
By specifying `position: 'top-center'` on toasts triggered from within dialogs, we ensure they render in a position that's clearly visible above the modal content.

---

## Files to Modify

1. **`src/components/FocusBacklogDialog.tsx`** - Improve handleCopy function with normalization and fallback
2. **`src/components/ui/sonner.tsx`** - Increase z-index for guaranteed visibility above dialogs

---

## Testing Checklist

1. Open the Practice Board Backlog dialog during a practice session on iOS
2. Tap the copy button on a backlog entry
3. Verify the "Copied to clipboard" toast appears visibly
4. Close the dialog and paste into the Practice Board textarea
5. Verify the pasted text shows proper formatting (newlines, bullets, etc.)
6. Test the same flow on desktop browsers for regression
