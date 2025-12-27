import { useLayoutEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

// Track which navigations should scroll to top
const shouldScrollToTop = new Set<string>();

export function markScrollToTop(path: string) {
  shouldScrollToTop.add(path);
}

export function ScrollToTop() {
  const { pathname } = useLocation();
  const prevPathname = useRef(pathname);

  // Use layout effect to avoid visible "jump" on mobile (runs before paint)
  useLayoutEffect(() => {
    if (shouldScrollToTop.has(pathname)) {
      shouldScrollToTop.delete(pathname);
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    } else if (prevPathname.current !== pathname) {
      const prevBase = prevPathname.current.split('/')[1];
      const currentBase = pathname.split('/')[1];

      if (prevBase !== currentBase) {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      }
    }

    prevPathname.current = pathname;
  }, [pathname]);

  return null;
}

