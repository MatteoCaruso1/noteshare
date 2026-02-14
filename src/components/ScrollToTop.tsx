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

  const scrollToTop = () => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Continuous watchdog: periodically clear stuck scroll locks.
  // Catches edge cases the MutationObserver might miss (e.g., Radix removing
  // dialog DOM before removing scroll-lock attributes, or race conditions).
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    // Aggressive initial sweep for first 3 seconds
    let elapsed = 0;
    const FAST_INTERVAL = 250;
    const FAST_DURATION = 3000;

    const fastWatchdog = window.setInterval(() => {
      elapsed += FAST_INTERVAL;
      if (elapsed >= FAST_DURATION) {
        window.clearInterval(fastWatchdog);
        return;
      }
      if (!isAnyOverlayOpen() && hasDocumentScrollLock()) {
        clearDocumentScrollLocks();
      }
    }, FAST_INTERVAL);

    // Long-running periodic watchdog (every 2s) to catch any stuck state
    const slowWatchdog = window.setInterval(() => {
      if (!isAnyOverlayOpen() && hasDocumentScrollLock()) {
        console.warn('[ScrollToTop] Watchdog cleared stuck scroll lock');
        clearDocumentScrollLocks();
      }
    }, 2000);

    return () => {
      window.clearInterval(fastWatchdog);
      window.clearInterval(slowWatchdog);
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

    // Desktop recovery: if user clicks/interacts with the page while scroll is locked
    // and no overlay is open, immediately unlock
    const handleInteraction = () => {
      if (!isAnyOverlayOpen() && hasDocumentScrollLock()) {
        console.warn('[ScrollToTop] User interaction cleared stuck scroll lock');
        clearDocumentScrollLocks();
      }
    };

    document.addEventListener('click', handleInteraction);
    document.addEventListener('wheel', handleInteraction, { passive: true });

    return () => {
      observer.disconnect();
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('wheel', handleInteraction);
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

