
# Plan: Fix Mouse Wheel/Touchpad Scrolling Issue

## Root Cause Analysis

After extensive investigation with the debug overlay, the real issue is now clear:

**The scroll-lock detection shows everything is "OK" because there ARE no CSS scroll locks.** The actual problem is that **mouse wheel and touchpad gestures don't scroll the page, but dragging the scrollbar DOES work**.

This is a fundamentally different issue - it's about **wheel event propagation**, not CSS overflow settings.

### Key Evidence
1. Debug overlay shows green "OK" - no overflow:hidden, no data-scroll-locked
2. Scrollbar can be dragged to scroll the page
3. Dialogs/popups scroll normally with the wheel
4. Issue persists across page loads and even version reverts

### Most Likely Cause
The CSS combination in `src/index.css`:

```css
html {
  scroll-behavior: smooth;
  scrollbar-gutter: stable;
}

body {
  overflow-y: scroll;
}
```

When `scroll-behavior: smooth` is applied to `<html>` AND the body has forced `overflow-y: scroll`, some browser/OS combinations can experience wheel event issues. The `scrollbar-gutter: stable` is also known to cause quirks.

Additionally, the user mentioned "I don't want a scrollbar" - suggesting the visible scrollbar isn't desired and the forced `overflow-y: scroll` on body was added as part of the scroll-lock fixes.

---

## Solution

### 1. Remove forced scrollbar and simplify scroll behavior

**File: `src/index.css`**

Change the base scroll styles from:
```css
html {
  scroll-behavior: smooth;
  scrollbar-gutter: stable;
}

body {
  overflow-y: scroll;
}

body:not([data-scroll-locked]):not(.overflow-hidden) {
  overflow-y: scroll !important;
}

html:not(.overflow-hidden):not([data-scroll-locked]) {
  overflow-y: auto !important;
}
```

To:
```css
html {
  scroll-behavior: smooth;
  /* Remove scrollbar-gutter: stable - can cause scroll issues */
}

body {
  /* Let browser handle overflow naturally - no forced scrollbar */
  overflow-y: auto;
}

/* Safety net: only apply when explicitly unlocked */
body:not([data-scroll-locked]):not(.overflow-hidden) {
  overflow-y: auto !important;
}

html:not(.overflow-hidden):not([data-scroll-locked]) {
  overflow-y: auto !important;
}
```

Key changes:
- Remove `scrollbar-gutter: stable` from html
- Change body from `overflow-y: scroll` to `overflow-y: auto`
- Change safety net from `scroll` to `auto`

### 2. Remove the aggressive scroll-lock recovery system (optional cleanup)

Since the issue was never a scroll-lock problem, the MutationObserver watchdog system in `ScrollToTop.tsx` can be simplified. However, keeping it as a safety net is fine - it just wasn't solving the real issue.

### 3. Hide scrollbar via CSS (user preference)

Since the user mentioned they don't want a scrollbar visible:

**File: `src/index.css`**

Add cross-browser scrollbar hiding while maintaining scroll functionality:
```css
/* Hide scrollbar but allow scrolling */
html {
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE/Edge */
}

html::-webkit-scrollbar {
  display: none; /* Chrome, Safari, Opera */
}
```

---

## Technical Details

### Why this should work
1. `overflow-y: auto` allows natural scroll behavior without forcing a scrollbar
2. Removing `scrollbar-gutter: stable` eliminates layout shift compensation that can interfere with scroll mechanics
3. The scrollbar-hiding CSS maintains scroll functionality while hiding the visual scrollbar

### Why reverting versions didn't fix it
If the CSS with `scroll-behavior: smooth` and `scrollbar-gutter: stable` has been present for a while, it would persist across reverts unless specifically changed.

### Files to modify
1. `src/index.css` - Remove forced scrollbar and scrollbar-gutter

### Testing after fix
1. Load /welcome - verify wheel scrolling works
2. Load main app pages - verify wheel scrolling works
3. Open dialogs/sheets - verify they still scroll
4. Verify no visible scrollbar (per user preference)
5. Verify on both desktop Chrome and Safari
