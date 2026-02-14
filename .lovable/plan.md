
## Fix: Toast Hidden Behind Practice Board Backlog Dialog

### Problem
The Sonner toast notifications appear behind the Practice Board Backlog dialog because of how browser stacking contexts work. The Radix Dialog uses a portal that appends directly to `document.body`, creating a top-level stacking context. However, the Sonner toaster is rendered inline within the React component tree -- trapped inside a lower stacking context. No z-index value can make an element escape its parent stacking context.

### Solution
Wrap the Sonner `<Toaster>` component in a `createPortal` call to `document.body`, matching the pattern already used by the Radix Toaster component. This places both the dialog and the toast container as siblings at the `document.body` level, where z-index comparisons actually work.

### Technical Details

**File: `src/components/ui/sonner.tsx`**
- Import `createPortal` from `react-dom`
- Wrap the returned `<Sonner>` component in `createPortal(..., document.body)` so it renders at the top level of the DOM, outside any app stacking contexts
- Add a `typeof document !== "undefined"` guard (same pattern as the existing Radix toaster)

This is a one-file, surgical change that directly mirrors the proven pattern already in `src/components/ui/toaster.tsx`.
