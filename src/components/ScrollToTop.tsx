import { useLayoutEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

// Track which navigations should scroll to top (explicit nav bar clicks)
const shouldScrollToTop = new Set<string>();

export function markScrollToTop(path: string) {
  shouldScrollToTop.add(path);
}

function hardScrollToTop() {
  // iOS Safari sometimes "restores" scroll after route change.
  // Do a hardened reset in multiple phases.
  // NOTE: We do NOT blur active elements here as it can interfere with
  // AlertDialog buttons on mobile (causing delete to fail).

  const scrollNow = () => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };

  // 1) immediate
  scrollNow();

  // 2) next paint
  requestAnimationFrame(() => {
    scrollNow();

    // 3) small delay (catches late iOS restoration)
    setTimeout(() => {
      scrollNow();
    }, 120);
  });
}

export function ScrollToTop() {
  const { pathname } = useLocation();
  const prevPathname = useRef(pathname);

  // Use layout effect to avoid visible "jump" on mobile (runs before paint)
  useLayoutEffect(() => {
    // Only scroll to top if this navigation was explicitly marked (nav bar click)
    if (shouldScrollToTop.has(pathname)) {
      shouldScrollToTop.delete(pathname);
      hardScrollToTop();
    }
    // Do NOT auto-scroll on route changes - let scroll restoration handle back navigation

    prevPathname.current = pathname;
  }, [pathname]);

  return null;
}

