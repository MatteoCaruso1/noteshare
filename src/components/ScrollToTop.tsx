import { useLayoutEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';

// Track which navigations should scroll to top (explicit nav bar clicks)
const pendingScrollToTop = { current: false };

export function markScrollToTop(_path: string) {
  pendingScrollToTop.current = true;
}

export function ScrollToTop() {
  const { pathname } = useLocation();
  const prevPathname = useRef(pathname);
  const scrollToTop = useCallback(() => {
    // Sync scroll reset (iOS-safe)
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);

  // When route changes and scroll was marked, scroll immediately before paint
  useLayoutEffect(() => {
    if (pathname === prevPathname.current) return;

    if (pendingScrollToTop.current) {
      pendingScrollToTop.current = false;
      scrollToTop();
    }

    prevPathname.current = pathname;
  }, [pathname, scrollToTop]);

  return null;
}

