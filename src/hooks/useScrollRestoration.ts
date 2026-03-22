import { useEffect, useLayoutEffect, useRef, useState } from 'react';

interface StoredState {
  scrollY: number;
  displayCount: number;
}

const storedStates = new Map<string, StoredState>();

// Track which keys have been cleared (reset on next hook mount)
const clearedKeys = new Set<string>();

// Track if we're in the process of restoring scroll (global for PageLayout to use)
let isRestoringScroll = false;
export function getIsRestoringScroll() {
  return isRestoringScroll;
}

// Clear saved state for a route (used when navigating via nav bar)
export function clearScrollState(key: string) {
  storedStates.delete(key);
  clearedKeys.add(key);
}

// Get the saved scroll position for a key (used for instant restore)
export function getSavedScrollPosition(key: string): number | null {
  const saved = storedStates.get(key);
  if (saved && saved.scrollY > 0 && !clearedKeys.has(key)) {
    return saved.scrollY;
  }
  return null;
}

export function useScrollRestoration(key: string, initialDisplayCount: number = 10) {
  const isRestoring = useRef(false);
  const savedState = storedStates.get(key);
  const wasCleared = clearedKeys.has(key);
  
  // Initialize displayCount from saved state or default
  // If the key was cleared, use initial value
  const [displayCount, setDisplayCount] = useState(
    wasCleared ? initialDisplayCount : (savedState?.displayCount ?? initialDisplayCount)
  );

  // Reset displayCount if key was cleared (handles React state initialization race)
  useLayoutEffect(() => {
    if (wasCleared) {
      clearedKeys.delete(key);
      setDisplayCount(initialDisplayCount);
    }
  }, [key, wasCleared, initialDisplayCount]);

  // Restore scroll position synchronously before paint
  useLayoutEffect(() => {
    // Don't restore if the state was just cleared
    if (wasCleared) return;
    
    // Re-check savedState here since it may have been cleared
    const currentSavedState = storedStates.get(key);
    if (currentSavedState && currentSavedState.scrollY > 0) {
      isRestoring.current = true;
      isRestoringScroll = true;
      
      const targetY = currentSavedState.scrollY;
      
      // Apply scroll immediately (synchronously before paint)
      window.scrollTo({ top: targetY, left: 0, behavior: 'auto' });
      
      // Mark restoration complete after a frame
      requestAnimationFrame(() => {
        isRestoring.current = false;
        isRestoringScroll = false;
      });
      
      // Re-apply after content settles (delayed layout effects in collapsibles, autosize, etc.)
      const correctionTimeout = setTimeout(() => {
        if (Math.abs(window.scrollY - targetY) > 30) {
          isRestoring.current = true;
          isRestoringScroll = true;
          window.scrollTo({ top: targetY, left: 0, behavior: 'auto' });
          requestAnimationFrame(() => {
            isRestoring.current = false;
            isRestoringScroll = false;
          });
        }
      }, 400);
      
      return () => clearTimeout(correctionTimeout);
    }
  }, [key, wasCleared]);

  // Save scroll position and displayCount continuously
  useEffect(() => {
    const handleScroll = () => {
      if (!isRestoring.current) {
        storedStates.set(key, { scrollY: window.scrollY, displayCount });
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [key, displayCount]);

  // Also save when displayCount changes
  useEffect(() => {
    const current = storedStates.get(key);
    storedStates.set(key, { 
      scrollY: current?.scrollY ?? window.scrollY, 
      displayCount 
    });
  }, [key, displayCount]);

  return { displayCount, setDisplayCount };
}
