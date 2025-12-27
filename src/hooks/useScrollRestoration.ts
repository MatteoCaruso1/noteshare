import { useEffect, useLayoutEffect, useRef, useState } from 'react';

interface StoredState {
  scrollY: number;
  displayCount: number;
}

const storedStates = new Map<string, StoredState>();

// Track which keys have been cleared (reset on next hook mount)
const clearedKeys = new Set<string>();

// Clear saved state for a route (used when navigating via nav bar)
export function clearScrollState(key: string) {
  storedStates.delete(key);
  clearedKeys.add(key);
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
      // Small delay to allow content to render with restored displayCount
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.scrollTo({ top: currentSavedState.scrollY, left: 0, behavior: 'auto' });
          setTimeout(() => {
            isRestoring.current = false;
          }, 50);
        });
      });
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
