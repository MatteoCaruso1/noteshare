

# Fix Practice Board Link Toggle Visibility

## Problem
The Practice Board link toggle (ListTodo icon + Switch) is not appearing in the Quick Note or Practice Session toolbars, even though the Practice Board has content. The toggle depends on `currentFocus?.focus_text` being truthy, but data loading timing or conditional rendering may cause it to not display.

## Root Cause
In `QuickNoteCapture.tsx`, the toggle is conditionally rendered -- it only mounts when `currentFocus?.focus_text` is truthy. When the collapsible opens, the `useCurrentFocusEntry` hook may not have resolved yet, so the toggle never appears (and once the data arrives, the component may not re-evaluate properly). Similarly, in `PracticeControls.tsx`, the toggle uses an `invisible` CSS class but could still be affected by data timing.

## Fix

### 1. QuickNoteCapture.tsx -- Always render the toggle
Change from conditional rendering to always-render with `invisible` class (matching the PracticeControls pattern). This ensures the toggle is in the DOM and becomes visible once data loads, rather than needing a re-render to mount.

**Before:**
```tsx
{currentFocus?.focus_text && (
  <Tooltip>
    <TooltipTrigger asChild>
      <div className="flex items-center gap-2 ml-auto cursor-pointer ...">
```

**After:**
```tsx
<Tooltip>
  <TooltipTrigger asChild>
    <div className={`flex items-center gap-2 ml-auto cursor-pointer ... ${!currentFocus?.focus_text ? 'invisible' : ''}`}>
```

### 2. PracticeControls.tsx -- Verify same pattern is correct
The existing `invisible` pattern in PracticeControls looks correct. No changes needed unless testing reveals an issue.

## Files Modified
- `src/components/QuickNoteCapture.tsx` (change conditional render to visibility toggle)

## What This Fixes
- Toggle will be in the DOM immediately, becoming visible as soon as focus data loads
- Prevents race conditions between collapsible opening and data availability
- Matches the pattern already used in PracticeControls for consistency

