import { useRef, useState, useCallback } from 'react';

/**
 * Custom hook to manage touch "pressed" states that don't trigger on scroll.
 * Solves the mobile issue where CSS :active triggers on touchstart before
 * the browser knows if the user intends to tap or scroll.
 * 
 * @param delay - ms to wait before showing pressed state (default 80ms)
 * @returns isPressed state and touch event handlers to spread on the element
 */
export function useTouchActive(delay = 80) {
  const [isPressed, setIsPressed] = useState(false);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const isTouchActive = useRef(false);

  const clearState = useCallback(() => {
    isTouchActive.current = false;
    setIsPressed(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    touchStartPos.current = null;
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    isTouchActive.current = true;
    
    // Small delay before showing pressed state - gives time for scroll detection
    timeoutRef.current = window.setTimeout(() => {
      if (isTouchActive.current) {
        setIsPressed(true);
      }
    }, delay);
  }, [delay]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartPos.current) return;
    
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartPos.current.x);
    const dy = Math.abs(touch.clientY - touchStartPos.current.y);
    
    // If moved more than 10px, user is scrolling - cancel pressed state
    if (dx > 10 || dy > 10) {
      clearState();
    }
  }, [clearState]);

  const handleTouchEnd = useCallback(() => {
    clearState();
  }, [clearState]);

  return {
    isPressed,
    touchHandlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onTouchCancel: handleTouchEnd,
    },
  };
}
