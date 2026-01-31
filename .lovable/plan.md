

# Plan: Fix App-Wide Scroll Lock Issue After Login

## Problem Summary

After logging in, pages (Practice, Friends, Groups, Pursuits, Profile) become unscrollable via wheel/trackpad/touch, though clicks still work. The only way to scroll is using the browser's native scrollbar.

## Root Cause Analysis

The current `ScrollToTop.tsx` `clearScrollLocks()` function runs:
1. On component mount
2. On route changes

However, there's a race condition:
- When navigating from `/auth` to `/`, `clearScrollLocks()` runs immediately
- React then finishes rendering the new page with various components
- Radix Dialog primitives (used by many components) temporarily add scroll locks during mount/animation
- These locks persist because `clearScrollLocks()` already ran

The CSS safety net in `src/index.css` should prevent this:
```css
body:not([data-scroll-locked="1"]):not(.overflow-hidden) {
  overflow-y: scroll !important;
}
```

But if the `data-scroll-locked="1"` attribute or `overflow-hidden` class is added AFTER the initial clear and never removed, the CSS safety net cannot help.

## Solution

Add a more aggressive scroll-lock clearing mechanism using a MutationObserver that watches for scroll-locking attributes/classes and removes them after a brief delay (to allow legitimate temporary locks from dialogs).

## Technical Changes

### File: `src/components/ScrollToTop.tsx`

**Changes:**
1. Add a MutationObserver that watches `<body>` and `<html>` for:
   - `data-scroll-locked` attribute additions
   - `overflow-hidden` class additions
2. When these are detected AND no Radix dialog is actually open (check for open dialog overlays), clear them after 500ms
3. Add an explicit `clearScrollLocks()` call after a 100ms delay on route change to catch late-applied locks

```text
Modified logic flow:
1. useLayoutEffect on mount → clearScrollLocks() immediately
2. useLayoutEffect on route change → clearScrollLocks() immediately + setTimeout clearScrollLocks() at 100ms
3. MutationObserver continuously watching:
   - If scroll lock added and no open dialog found after 500ms → clear it
```

### File: `src/index.css` (minor enhancement)

**Change:**
Strengthen the CSS safety net to also handle the `data-scroll-locked` attribute (Radix uses `data-scroll-locked="1"` but sometimes the value might differ):

```css
/* Existing rule - make more specific */
body:not([data-scroll-locked]):not(.overflow-hidden) {
  overflow-y: scroll !important;
}
```

(Remove the `="1"` to catch any value of the attribute)

## Implementation Steps

1. Update `ScrollToTop.tsx`:
   - Import `useRef` if not already imported
   - Add MutationObserver setup in a separate `useEffect`
   - Add delayed secondary `clearScrollLocks()` call after route changes
   - Add cleanup to disconnect observer on unmount

2. Update `src/index.css`:
   - Adjust the CSS selector to be more permissive

## Testing Checklist

- Sign in on desktop and immediately try wheel-scrolling on Practice page
- Sign in on mobile and try touch-scrolling on Practice page
- Navigate to Friends, Groups, Pursuits, Profile after login - all should scroll
- Open and close a dialog (e.g., Messages, Notifications) - scrolling should still work
- Open and close a Sheet (e.g., Members on Groups page) - scrolling should still work
- Complete the onboarding flow after signup - scrolling should work after

## Risk Assessment

- **Low risk**: Changes are defensive and only clear scroll locks when no legitimate dialog is open
- **Potential edge case**: If a dialog genuinely needs scroll lock and we clear it, the dialog content might become scrollable along with the page. Mitigation: 500ms delay allows dialogs to fully close before clearing.

