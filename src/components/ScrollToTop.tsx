import { useLayoutEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

// Track which navigations should scroll to top
const shouldScrollToTop = new Set<string>();

export function markScrollToTop(path: string) {
  shouldScrollToTop.add(path);
}

function hardScrollToTop() {
  // iOS Safari sometimes "restores" scroll after route change; do a hardened reset.
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;

  requestAnimationFrame(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  });
}

export function ScrollToTop() {
  const { pathname } = useLocation();
  const prevPathname = useRef(pathname);

  // Use layout effect to avoid visible "jump" on mobile (runs before paint)
  useLayoutEffect(() => {
    if (shouldScrollToTop.has(pathname)) {
      shouldScrollToTop.delete(pathname);
      hardScrollToTop();
    } else if (prevPathname.current !== pathname) {
      const prevBase = prevPathname.current.split('/')[1];
      const currentBase = pathname.split('/')[1];

      if (prevBase !== currentBase) {
        hardScrollToTop();
      }
    }

    prevPathname.current = pathname;
  }, [pathname]);

  return null;
}

