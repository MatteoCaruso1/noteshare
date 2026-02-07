
# Fix Regular Toast Positioning

## Problem Identified
The previous fix applied a `bottom` offset via inline styles to the Radix `ToastViewport`, but the component's base CSS class has `top-0` which anchors toasts to the **top** of the screen on mobile. Setting `bottom` has no effect when `top` is already defined - the element stays pinned to the top.

Sonner works because it uses a dedicated `mobileOffset` prop that properly overrides its internal positioning. Radix Toast requires manual CSS fixes.

## Solution
Match Sonner's approach by modifying the `ToastViewport` base styling to position from the bottom on mobile (not top), and ensuring the dynamic offset is applied correctly.

---

## Changes

### 1. Update `src/components/ui/toast.tsx` - Fix Base Viewport Styling

The `ToastViewport` currently has:
```tsx
className="fixed top-0 z-[100] flex ... sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col"
```

This anchors toasts to the TOP on mobile. Change to anchor to the BOTTOM and remove `top-0` for mobile:
```tsx
className="fixed bottom-0 left-0 right-0 z-[100] flex ... sm:right-0 sm:left-auto sm:flex-col md:max-w-[420px]"
```

Also add `top-auto` explicitly to prevent any cascade issues.

### 2. Update `src/components/ui/toaster.tsx` - Simplify Offset Logic

Since the base viewport now positions from the bottom, the inline style offset will work correctly. Keep the existing dynamic `mobileBottomOffset` calculation (92px/112px + safe-area) and ensure it applies.

Additionally, add `zIndex: 9999` inline to match Sonner's approach (defense in depth, in case the CSS selector `[data-radix-toast-viewport]` isn't matching).

---

## Technical Details

### File: `src/components/ui/toast.tsx`
Change ToastViewport className from:
```tsx
"fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]"
```

To:
```tsx
"fixed bottom-0 left-0 right-0 top-auto z-[100] flex max-h-screen w-full flex-col p-4 sm:right-0 sm:left-auto md:max-w-[420px]"
```

Key changes:
- Remove `top-0` (was anchoring to top on mobile)
- Add `bottom-0 left-0 right-0 top-auto` for consistent bottom anchoring
- Change `flex-col-reverse` to `flex-col` so toasts stack correctly from bottom
- Remove `sm:bottom-0 sm:top-auto` (now always bottom-anchored)

### File: `src/components/ui/toaster.tsx`
Update to include `zIndex` inline and ensure the bottom offset applies:
```tsx
<ToastViewport
  className={isMobile ? "" : ""}
  style={{
    bottom: isMobile ? mobileBottomOffset : undefined,
    zIndex: 9999,
  }}
/>
```

---

## Why This Will Work
- Sonner works because its `mobileOffset` prop properly sets the distance from the bottom
- Radix Toast will now also anchor to the bottom, so the inline `bottom` style will correctly push the viewport up above the BottomNav
- Both toast systems will use `z-index: 9999` ensuring they're above all other UI elements
- The dynamic offset (92px normal / 112px during practice) will correctly clear the BottomNav in both states

---

## Validation
After implementation:
1. Trigger a regular toast in "Capture Quick Note" mode - should appear above the bottom nav
2. Trigger a regular toast during a practice session - should appear above the expanded session UI
3. Trigger a Sonner toast - should remain working (no regression)
4. Test on both mobile and desktop viewports
