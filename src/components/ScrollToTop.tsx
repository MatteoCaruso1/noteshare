import { useLayoutEffect, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  isAnyOverlayOpen,
  hasDocumentScrollLock,
  clearDocumentScrollLocks,
} from '@/lib/scrollLock';

// Track which navigations should scroll to top (explicit nav bar clicks)
const pendingScrollToTop = { current: false };

export function markScrollToTop(_path: string) {
  pendingScrollToTop.current = true;
}

export function ScrollToTop() {
  const { pathname } = useLocation();
  const prevPathname = useRef(pathname);
  const clearTimeoutRef = useRef<number | null>(null);
  const watchdogRef = useRef<number | null>(null);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Startup watchdog: for ~3 seconds after mount, periodically clear stuck
  // scroll locks if no overlay is actually open.
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    let elapsed = 0;
    const WATCHDOG_INTERVAL = 250;
    const WATCHDOG_DURATION = 3000;

    watchdogRef.current = window.setInterval(() => {
      elapsed += WATCHDOG_INTERVAL;
      if (elapsed >= WATCHDOG_DURATION) {
        if (watchdogRef.current) {
          window.clearInterval(watchdogRef.current);
          watchdogRef.current = null;
        }
        return;
      }
      // Clear locks only when no overlay is open
      if (!isAnyOverlayOpen() && hasDocumentScrollLock()) {
        clearDocumentScrollLocks();
      }
    }, WATCHDOG_INTERVAL);

    return () => {
      if (watchdogRef.current) {
        window.clearInterval(watchdogRef.current);
        watchdogRef.current = null;
      }
    };
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // MutationObserver: watch for stuck scroll locks (attributes, classes, styles)
  // and clear them if no dialog is actually open.
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const observer = new MutationObserver(() => {
      if (hasDocumentScrollLock()) {
        // Clear any pending timeout
        if (clearTimeoutRef.current) {
          window.clearTimeout(clearTimeoutRef.current);
        }
        // Wait 500ms, then check if dialog is still open
        clearTimeoutRef.current = window.setTimeout(() => {
          if (!isAnyOverlayOpen()) {
            clearDocumentScrollLocks();
          }
        }, 500);
      }
    });

    // Observe body attributes + styles
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['data-scroll-locked', 'class', 'style'],
    });

    // Observe html attributes + styles
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-scroll-locked', 'class', 'style'],
    });

    return () => {
      observer.disconnect();
      if (clearTimeoutRef.current) {
        window.clearTimeout(clearTimeoutRef.current);
      }
    };
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Clear scroll locks on mount
  // ─────────────────────────────────────────────────────────────────────────
  useLayoutEffect(() => {
    if (!isAnyOverlayOpen()) {
      clearDocumentScrollLocks();
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // When route changes, clear scroll locks immediately + delayed
  // ─────────────────────────────────────────────────────────────────────────
  useLayoutEffect(() => {
    if (pathname === prevPathname.current) return;

    // Immediate clear
    if (!isAnyOverlayOpen()) {
      clearDocumentScrollLocks();
    }

    // Delayed clear to catch late-applied locks
    const delayedClear = window.setTimeout(() => {
      if (!isAnyOverlayOpen()) {
        clearDocumentScrollLocks();
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
  }, [pathname]);

  return null;
}

