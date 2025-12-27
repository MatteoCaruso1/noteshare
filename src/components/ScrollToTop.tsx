import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

// Track which navigations should scroll to top
const shouldScrollToTop = new Set<string>();

export function markScrollToTop(path: string) {
  shouldScrollToTop.add(path);
}

export function ScrollToTop() {
  const { pathname } = useLocation();
  const prevPathname = useRef(pathname);

  useEffect(() => {
    // Only scroll to top if this navigation was marked for it
    // or if we're navigating from a different base route
    if (shouldScrollToTop.has(pathname)) {
      shouldScrollToTop.delete(pathname);
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    } else if (prevPathname.current !== pathname) {
      // Check if it's a different "section" (different base path)
      const prevBase = prevPathname.current.split('/')[1];
      const currentBase = pathname.split('/')[1];

      // If navigating between main sections, scroll to top
      if (prevBase !== currentBase) {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      }
    }

    prevPathname.current = pathname;
  }, [pathname]);

  return null;
}
