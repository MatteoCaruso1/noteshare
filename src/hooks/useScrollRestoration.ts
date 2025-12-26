import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const scrollPositions = new Map<string, number>();

export function useScrollRestoration(key: string) {
  const location = useLocation();
  const isRestoring = useRef(false);

  // Save scroll position before navigating away
  useEffect(() => {
    const handleScroll = () => {
      if (!isRestoring.current) {
        scrollPositions.set(key, window.scrollY);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [key]);

  // Restore scroll position when coming back
  useEffect(() => {
    const savedPosition = scrollPositions.get(key);
    if (savedPosition !== undefined && savedPosition > 0) {
      isRestoring.current = true;
      // Use requestAnimationFrame to ensure DOM has rendered
      requestAnimationFrame(() => {
        window.scrollTo(0, savedPosition);
        // Reset restoring flag after a short delay
        setTimeout(() => {
          isRestoring.current = false;
        }, 100);
      });
    }
  }, [key, location.key]);
}
