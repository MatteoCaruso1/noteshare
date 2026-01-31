import { useLayoutEffect, useRef, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Track which navigations should scroll to top (explicit nav bar clicks)
const pendingScrollToTop = { current: false };

export function markScrollToTop(_path: string) {
  pendingScrollToTop.current = true;
}

export function ScrollToTop() {
  const { pathname } = useLocation();
  const prevPathname = useRef(pathname);
  const clearTimeoutRef = useRef<number | null>(null);

  const clearScrollLocks = useCallback(() => {
    // Clear any stuck scroll locks from Radix dialogs or animations
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
    document.body.style.pointerEvents = '';
    document.body.removeAttribute('data-scroll-locked');
    document.documentElement.removeAttribute('data-scroll-locked');

    // Some libraries lock scroll by toggling overflow-hidden class
    document.documentElement.classList.remove('overflow-hidden');
    document.body.classList.remove('overflow-hidden');
  }, []);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);

  // Check if a Radix dialog/sheet is actually open
  const isDialogOpen = useCallback(() => {
    return !!(
      document.querySelector('[role="dialog"][data-state="open"]') ||
      document.querySelector('[data-radix-dialog-overlay]') ||
      document.querySelector('[data-vaul-drawer]')
    );
  }, []);

  // MutationObserver to watch for stuck scroll locks
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const hasScrollLock = 
        document.body.hasAttribute('data-scroll-locked') ||
        document.body.classList.contains('overflow-hidden') ||
        document.documentElement.hasAttribute('data-scroll-locked') ||
        document.documentElement.classList.contains('overflow-hidden');

      if (hasScrollLock) {
        // Clear any pending timeout
        if (clearTimeoutRef.current) {
          window.clearTimeout(clearTimeoutRef.current);
        }
        // Wait 500ms, then check if dialog is still open
        clearTimeoutRef.current = window.setTimeout(() => {
          if (!isDialogOpen()) {
            clearScrollLocks();
          }
        }, 500);
      }
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['data-scroll-locked', 'class', 'style'],
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-scroll-locked', 'class'],
    });

    return () => {
      observer.disconnect();
      if (clearTimeoutRef.current) {
        window.clearTimeout(clearTimeoutRef.current);
      }
    };
  }, [clearScrollLocks, isDialogOpen]);

  // Clear scroll locks on mount
  useLayoutEffect(() => {
    clearScrollLocks();
  }, [clearScrollLocks]);

  // When route changes, clear scroll locks immediately + delayed
  useLayoutEffect(() => {
    if (pathname === prevPathname.current) return;

    // Immediate clear
    clearScrollLocks();

    // Delayed clear to catch late-applied locks (e.g., after React finishes rendering)
    const delayedClear = window.setTimeout(() => {
      if (!isDialogOpen()) {
        clearScrollLocks();
      }
    }, 100);

    if (pendingScrollToTop.current) {
      pendingScrollToTop.current = false;
      scrollToTop();
    }

    prevPathname.current = pathname;

    return () => {
      window.clearTimeout(delayedClear);
    };
  }, [pathname, scrollToTop, clearScrollLocks, isDialogOpen]);

  return null;
}

