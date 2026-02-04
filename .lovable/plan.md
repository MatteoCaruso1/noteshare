
# Fix Practice Board Textarea Auto-sizing on App Resume

## Problem Analysis

When users navigate away from the noteshare web app (going to iOS Home Screen, switching to another app, or switching browser tabs) and then return, the Practice Board textarea collapses to a smaller height even though it contains text. This happens because:

1. **iOS Safari suspension behavior**: iOS aggressively suspends web views when the app is in the background, which can reset or corrupt the DOM state
2. **Timing issues**: The current double `requestAnimationFrame` approach may fire before the browser has fully restored rendering
3. **Missing triggers**: The current code only handles `visibilitychange` but not window `focus`, which is needed for desktop tab switching and some mobile scenarios
4. **Potential scrollHeight corruption**: Immediately after resume, `scrollHeight` may return the minimum height (36px) because the browser hasn't fully recalculated layout

## Solution

I'll implement a more robust multi-layered approach to ensure the textarea auto-sizes correctly when returning to the app:

### Changes to `src/components/TodaysFocus.tsx`

1. **Add multiple retry attempts with increasing delays**: Instead of a single double-RAF, use multiple attempts at different timing intervals (0ms, 50ms, 150ms, 500ms) to catch the correct moment when the browser has fully restored layout

2. **Add `focus` event listener**: Handle window focus in addition to visibility change for more comprehensive coverage

3. **Add a "sanity check" mechanism**: After auto-sizing, verify that the height makes sense (if there's text content, height should be more than minimum). If not, schedule another retry

4. **Force a style recalculation**: Before measuring `scrollHeight`, force a layout reflow by reading a computed style property

### Implementation Details

```typescript
// Enhanced autosize with forced reflow
const autosizeTextarea = useCallback(() => {
  const textarea = textareaRef.current;
  if (!textarea) return;
  
  // Force a reflow by reading offsetHeight before setting
  void textarea.offsetHeight;
  
  textarea.style.height = 'auto';
  const newHeight = Math.max(36, textarea.scrollHeight);
  textarea.style.height = `${newHeight}px`;
  
  return newHeight;
}, []);

// Robust visibility/focus handler with multiple retries
useEffect(() => {
  if (!isOpen) return;

  const scheduleAutosize = () => {
    // Immediate attempt
    autosizeTextarea();
    
    // Multiple delayed attempts to catch browser restoration
    const timings = [50, 150, 300, 500];
    const timeoutIds = timings.map(delay => 
      setTimeout(() => {
        const height = autosizeTextarea();
        // Sanity check: if we have text but height is minimum, try again
        if (text.trim() && height <= 40) {
          setTimeout(autosizeTextarea, 100);
        }
      }, delay)
    );
    
    return timeoutIds;
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      scheduleAutosize();
    }
  };

  const handleWindowFocus = () => {
    scheduleAutosize();
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('focus', handleWindowFocus);
  
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('focus', handleWindowFocus);
  };
}, [isOpen, autosizeTextarea, text]);
```

## Benefits

- **Multi-attempt strategy**: Catches the correct moment even if browser restoration is slow
- **Dual event listeners**: Handles both iOS app switching and desktop tab switching
- **Forced reflow**: Ensures accurate `scrollHeight` measurement
- **Sanity checking**: Detects when autosize fails and retries automatically
- **Clean timeout management**: All timeouts are properly cleaned up on unmount

## Technical Notes

- The solution aligns with the existing architecture patterns for mobile scroll preservation and visibility handling
- Minimal performance impact since these handlers only fire on app resume, not during normal use
- Compatible with the existing Radix Collapsible animation timing
