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
  const clearScrollLocks = useCallback(() => {
    // Clear any stuck scroll locks from Radix dialogs or animations
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    document.body.removeAttribute('data-scroll-locked');
  }, []);

  const scrollToTop = useCallback(() => {
    // Sync scroll reset (iOS-safe)
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);

  // When route changes, clear scroll locks and optionally scroll to top
  useLayoutEffect(() => {
    if (pathname === prevPathname.current) return;

    // Always clear scroll locks on route change
    clearScrollLocks();

    if (pendingScrollToTop.current) {
      pendingScrollToTop.current = false;
      scrollToTop();
    }

    prevPathname.current = pathname;
  }, [pathname, scrollToTop, clearScrollLocks]);

  return null;
}

