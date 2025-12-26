import { useEffect, useLayoutEffect, useRef } from 'react';

const scrollPositions = new Map<string, number>();

export function useScrollRestoration(key: string) {
  const isRestoring = useRef(false);

  // Restore scroll position synchronously before paint
  useLayoutEffect(() => {
    const savedPosition = scrollPositions.get(key);
    if (savedPosition !== undefined && savedPosition > 0) {
      isRestoring.current = true;
      window.scrollTo({ top: savedPosition, behavior: 'instant' });
      // Reset restoring flag after a short delay
      setTimeout(() => {
        isRestoring.current = false;
      }, 50);
    }
  }, [key]);

  // Save scroll position continuously
  useEffect(() => {
    const handleScroll = () => {
      if (!isRestoring.current) {
        scrollPositions.set(key, window.scrollY);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [key]);
}
