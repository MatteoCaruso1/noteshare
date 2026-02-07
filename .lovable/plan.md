
# Plan: Fix Practice Board Textarea Collapse After Tab/App Switch

## Problem Summary
When the Practice Board is expanded and the user switches to another browser tab (or backgrounds the web app on mobile), upon returning, the textarea collapses to its minimum height despite containing multi-line content. The existing `visibilitychange` and `focus` event handlers with multiple retry attempts are not reliably fixing the issue.

## Root Cause Analysis

After extensive investigation, I've identified **three likely contributing factors**:

### 1. Safari's Back/Forward Cache (bfcache) Behavior
Safari (iOS and macOS) uses an aggressive page caching mechanism called bfcache. When a page is restored from bfcache:
- The `visibilitychange` event may fire before the DOM is fully re-rendered
- The `pageshow` event (with `event.persisted = true`) is the **canonical event** for bfcache restoration, but it's **not being listened to** in the current code
- `scrollHeight` measurements can return stale/incorrect values immediately after restoration

### 2. Radix Collapsible CSS Variables
The Radix `CollapsibleContent` component measures height and stores it in `--radix-collapsible-content-height`. Upon page restoration:
- This measurement may be stale
- The content may be in a "hidden" state briefly during restoration
- The `hidden` attribute on the content div can cause `scrollHeight` to return 0

### 3. Timing Race Conditions
The current retry strategy uses delays of `[50, 150, 300, 500]` ms, but:
- Safari's bfcache restoration can take longer
- The textarea may still report incorrect `scrollHeight` at these intervals
- The `overflow: hidden` class on the textarea prevents seeing a scrollbar but also may affect measurement

## Solution Architecture

### Approach: Multi-Signal Detection with Aggressive Recovery

I'll implement a more robust autosize recovery system that:
1. **Adds `pageshow` event listener** - The official event for bfcache restoration
2. **Forces a DOM reflow before measurement** - More aggressively than current `offsetHeight` read
3. **Temporarily removes `overflow: hidden`** - To ensure accurate `scrollHeight` measurement
4. **Extends retry timings** - Add longer delays (1000ms, 1500ms) for Safari's slower restoration
5. **Adds a MutationObserver fallback** - Detects when `hidden` attribute is removed from CollapsibleContent

---

## Implementation Details

### File: `src/components/TodaysFocus.tsx`

#### Change 1: Enhanced `autosizeTextarea` function
```tsx
// Current (lines 48-63):
const autosizeTextarea = useCallback(() => {
  const textarea = textareaRef.current;
  if (!textarea) return 0;
  void textarea.offsetHeight;
  textarea.style.height = 'auto';
  const newHeight = Math.max(36, textarea.scrollHeight);
  textarea.style.height = `${newHeight}px`;
  return newHeight;
}, []);

// New:
const autosizeTextarea = useCallback((force = false) => {
  const textarea = textareaRef.current;
  if (!textarea) return 0;
  
  // Force layout reflow by reading multiple layout properties
  // This is more aggressive than just offsetHeight for bfcache scenarios
  void textarea.getBoundingClientRect();
  void textarea.offsetHeight;
  void textarea.scrollHeight;
  
  // Temporarily remove overflow:hidden to get accurate scrollHeight
  const originalOverflow = textarea.style.overflow;
  textarea.style.overflow = 'visible';
  
  textarea.style.height = 'auto';
  
  // Force another reflow after height reset
  void textarea.scrollHeight;
  
  const newHeight = Math.max(36, textarea.scrollHeight);
  textarea.style.height = `${newHeight}px`;
  
  // Restore overflow
  textarea.style.overflow = originalOverflow;
  
  return newHeight;
}, []);
```

#### Change 2: Add `pageshow` event listener for bfcache
```tsx
// In the visibility/focus effect (lines 150-199), add pageshow handler:
useEffect(() => {
  if (!isOpen) return;

  const timeoutIds: NodeJS.Timeout[] = [];

  const scheduleAutosize = (source: string) => {
    timeoutIds.forEach(clearTimeout);
    timeoutIds.length = 0;

    // Immediate attempt
    autosizeTextarea(true);

    // Extended timings - Safari bfcache can be slow
    const timings = [50, 150, 300, 500, 1000, 1500];
    timings.forEach(delay => {
      const id = setTimeout(() => {
        const height = autosizeTextarea(true);
        // More aggressive sanity check
        if (text.trim() && height <= 40) {
          // Double-try with RAF for painting cycle
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              autosizeTextarea(true);
            });
          });
        }
      }, delay);
      timeoutIds.push(id);
    });
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      scheduleAutosize('visibility');
    }
  };

  const handleWindowFocus = () => {
    scheduleAutosize('focus');
  };

  // bfcache restoration - the most reliable Safari event
  const handlePageShow = (event: PageTransitionEvent) => {
    if (event.persisted) {
      // Page was restored from bfcache
      scheduleAutosize('pageshow');
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('focus', handleWindowFocus);
  window.addEventListener('pageshow', handlePageShow);

  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('focus', handleWindowFocus);
    window.removeEventListener('pageshow', handlePageShow);
    timeoutIds.forEach(clearTimeout);
  };
}, [isOpen, autosizeTextarea, text]);
```

#### Change 3: MutationObserver for Radix `hidden` attribute changes
```tsx
// New effect after the visibility effect:
useEffect(() => {
  if (!isOpen) return;
  const contentEl = collapsibleContentRef.current;
  if (!contentEl) return;
  
  // Watch for Radix removing the hidden attribute (happens during transitions)
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'attributes' && mutation.attributeName === 'hidden') {
        // Hidden state changed - re-measure
        requestAnimationFrame(() => {
          autosizeTextarea(true);
        });
      }
    }
  });
  
  observer.observe(contentEl, { attributes: true, attributeFilter: ['hidden'] });
  
  return () => observer.disconnect();
}, [isOpen, autosizeTextarea]);
```

#### Change 4: Ensure textarea doesn't have CSS hiding issues
In the textarea className (line 858), replace:
```tsx
// Current:
className="practice-board-textarea min-h-[36px] resize-none text-sm caret-foreground overflow-hidden"

// New - remove overflow-hidden from className, control it in JS:
className="practice-board-textarea min-h-[36px] resize-none text-sm caret-foreground"
style={{ overscrollBehavior: 'contain', overflow: 'hidden' }}
```

This moves `overflow: hidden` to inline style so the autosize function can temporarily override it.

---

## Testing Strategy

1. **Desktop**: Open Practice Board, add multi-line text, switch tabs, return - textarea should remain expanded
2. **iOS Safari**: Same test in Safari mobile browser
3. **iOS PWA**: Same test in installed web app
4. **Quick switch**: Rapidly switch away and back (tests immediate bfcache)
5. **Long background**: Leave app in background for 30+ seconds, return (tests extended timeouts)

## Risk Assessment

- **Low risk**: Changes are additive and don't modify core functionality
- **Fallback safety**: Multiple retry attempts ensure eventual recovery even if some fail
- **No breaking changes**: Existing behavior is preserved, just enhanced
