
# Plan: Fix Blue Focus Ring on Premium Dialog Buttons

## Problem
When clicking/focusing the "7 days free" button in the Premium dialog on desktop, a **blue ring** appears instead of the intended amber/gold ring. This persists even after previous attempts to fix it using Tailwind's `!important` modifier.

## Root Cause
1. The `Button` component in `button.tsx` has a base style that includes `focus-visible:ring-ring`
2. The CSS variable `--ring` in dark mode is set to `198 93% 59%` - a **cyan/blue color**
3. Using `!ring-jazz-amber` doesn't fully override because:
   - Tailwind Merge doesn't reliably merge CSS variable-based ring colors
   - The `focus-visible:ring-ring` uses `var(--ring)` while our override uses a named color

## Solution
There are two approaches, and I recommend **Approach A** for reliability:

### Approach A: Use inline style override (Recommended)
Add an inline `style` prop to force the `--tw-ring-color` CSS variable to the jazz-amber value. This guarantees the override regardless of class specificity.

**Files to modify:**
- `src/components/PremiumDialog.tsx`

**Changes:**
1. Add an inline style to both buttons:
   ```tsx
   style={{ '--tw-ring-color': 'hsl(38, 92%, 50%)' } as React.CSSProperties}
   ```
2. Simplify the className to use standard focus-visible classes without the `!` modifiers

### Approach B: Remove ring entirely for these buttons
If the focus ring isn't important for accessibility in this modal context, we could remove it entirely with `focus-visible:ring-0 focus-visible:ring-offset-0`.

---

## Technical Details

### Current button code:
```tsx
<Button 
  onClick={handleStartTrial}
  className="... !ring-jazz-amber focus:!ring-jazz-amber focus-visible:!ring-jazz-amber"
>
```

### Proposed button code (Approach A):
```tsx
<Button 
  onClick={handleStartTrial}
  className="... focus-visible:ring-2 focus-visible:ring-offset-2"
  style={{ '--tw-ring-color': 'hsl(38, 92%, 50%)' } as React.CSSProperties}
>
```

This directly sets the Tailwind ring color CSS variable to the jazz-amber HSL value (`38 92% 50%`), bypassing any class specificity issues.

## Testing
After implementation, verify by:
1. Opening the Premium dialog
2. Clicking on the "7 days free" button
3. Confirming the focus ring is amber/gold, not blue
4. Repeat for the "Lifetime access" button
