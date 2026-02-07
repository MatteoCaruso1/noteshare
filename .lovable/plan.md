
# Fix Toast Hidden Behind Bottom Nav During Practice Sessions

## Problem
Toasts are appearing behind the bottom navigation bar during active practice sessions. The current implementation tries to position toasts using `style={{ bottom: '80px + safe-area' }}`, but Sonner's internal positioning overrides this.

## Root Cause
Sonner has its own positioning system that ignores custom `bottom` values in the `style` prop. Instead, Sonner provides dedicated `offset` and `mobileOffset` props (see Sonner's TypeScript definitions) specifically for this purpose:

```typescript
type Offset = {
    top?: string | number;
    right?: string | number;
    bottom?: string | number;
    left?: string | number;
} | string | number;

offset?: Offset;
mobileOffset?: Offset;
```

The `style={{ bottom: ... }}` approach does not work because Sonner internally sets its own positioning.

## Solution
Replace the `style.bottom` approach with Sonner's native `offset` and `mobileOffset` props.

---

## Implementation

### File: `src/components/ui/sonner.tsx`

**Current code:**
```tsx
<Sonner
  theme={theme as ToasterProps["theme"]}
  className="toaster group session-focus-exempt"
  position={isMobile ? "bottom-center" : "bottom-right"}
  style={{ 
    bottom: isMobile ? 'calc(80px + env(safe-area-inset-bottom, 0px))' : '24px',
    zIndex: 60,
    ['--toast-enter-duration' as string]: '300ms',
    ['--toast-exit-duration' as string]: '200ms',
  }}
  ...
/>
```

**Updated code:**
```tsx
<Sonner
  theme={theme as ToasterProps["theme"]}
  className="toaster group session-focus-exempt"
  position={isMobile ? "bottom-center" : "bottom-right"}
  offset={24}
  mobileOffset={80}
  style={{ 
    zIndex: 60,
    ['--toast-enter-duration' as string]: '300ms',
    ['--toast-exit-duration' as string]: '200ms',
  }}
  ...
/>
```

**Changes:**
1. Add `offset={24}` - desktop offset from screen edge (24px from bottom-right)
2. Add `mobileOffset={80}` - mobile offset from screen edge (80px from bottom to clear the nav bar)
3. Remove the `bottom` property from the `style` object since Sonner handles this internally via the offset props

---

## Technical Notes

- The `mobileOffset` prop is specifically designed for mobile bottom navigation scenarios
- Sonner internally detects mobile viewports and applies `mobileOffset` automatically
- The safe-area-inset is typically handled by the nav bar itself, so 80px should be sufficient to clear the nav
- The `zIndex: 60` stays in `style` to ensure toast is above the nav bar (z-50)

## Testing
1. Start a practice session
2. Trigger a toast (e.g., via any action that shows a notification)
3. Verify the toast appears fully visible above the bottom navigation bar
4. Test on both mobile and desktop views
