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
  const hasScrolledRef = useRef(false);

  const scrollToTop = useCallback(() => {
    // Prevent scroll position from "jumping" by scrolling immediately
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);

  // When route changes and scroll was marked, scroll immediately before paint
  useLayoutEffect(() => {
    if (pathname !== prevPathname.current) {
      if (pendingScrollToTop.current) {
        pendingScrollToTop.current = false;
        hasScrolledRef.current = false;
        
        // Scroll immediately - before any render
        scrollToTop();
        
        // Schedule additional scroll after React has committed the new page
        // This catches cases where content shifts after mount
        requestAnimationFrame(() => {
          scrollToTop();
          // One more after a brief delay for iOS Safari restoration
          setTimeout(scrollToTop, 50);
        });
      }
      prevPathname.current = pathname;
    }
  }, [pathname, scrollToTop]);

  return null;
}

