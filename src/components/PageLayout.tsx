import { ReactNode, useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getSavedScrollPosition } from '@/hooks/useScrollRestoration';

interface PageLayoutProps {
  children: ReactNode;
}

interface PageHeaderProps {
  children: ReactNode;
  className?: string;
}

interface PageBodyProps {
  children: ReactNode;
  className?: string;
}

/**
 * PageHeader - Renders instantly with no animation.
 * Use for page titles and controls that should appear immediately.
 */
export function PageHeader({ children, className = '' }: PageHeaderProps) {
  return (
    <div className={`page-header min-h-[60px] ${className}`}>
      {children}
    </div>
  );
}

/**
 * PageBody - Animated content area with subtle crossfade + blur transition.
 * Animation: opacity 0→1, blur 4px→0 for smooth page switching
 * Delay: 120ms, Duration: 280ms
 */
export function PageBody({ children, className = '' }: PageBodyProps) {
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(false);
  const prevPathRef = useRef(location.pathname);
  const initialMount = useRef(true);

  useEffect(() => {
    // On route change, animate in using requestAnimationFrame for smoother timing
    if (location.pathname !== prevPathRef.current) {
      prevPathRef.current = location.pathname;
      // Use rAF to ensure we're synchronized with the browser's render cycle
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsVisible(true);
        });
      });
    } else if (initialMount.current) {
      // Initial mount - immediate visibility, no delay
      initialMount.current = false;
      requestAnimationFrame(() => {
        setIsVisible(true);
      });
    }
  }, [location.pathname]);

  return (
    <div
      className={`page-body ${className}`}
      style={{
        opacity: isVisible ? 1 : 0,
        // CRITICAL: Use 'none' when visible to avoid creating a persistent stacking context
        // that traps fixed/z-indexed elements (like toasts) beneath other content
        filter: isVisible ? 'none' : 'blur(2px)',
        transition: 'opacity 280ms cubic-bezier(0.4, 0, 0.2, 1), filter 280ms cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {children}
    </div>
  );
}

// Map route paths to scroll restoration keys
function getScrollKeyForPath(pathname: string): string | null {
  if (pathname === '/') return 'index-timeline';
  if (pathname === '/friends') return 'friends-timeline';
  if (pathname === '/projects') return 'projects';
  if (pathname === '/working-toward') return 'working-toward';
  return null;
}

/**
 * PageLayout - Wrapper for page content.
 * Handles scroll restoration without visibility toggling to prevent jitter.
 * Note: Home route (/) uses anchor-based restoration in Index.tsx as primary,
 * but we still apply absolute scroll here as an immediate best-effort.
 */
export function PageLayout({ children }: PageLayoutProps) {
  const location = useLocation();
  const hasAppliedScroll = useRef(false);
  
  // Apply scroll restoration synchronously before paint
  useLayoutEffect(() => {
    if (hasAppliedScroll.current) return;
    
    const scrollKey = getScrollKeyForPath(location.pathname);
    const savedScrollY = scrollKey ? getSavedScrollPosition(scrollKey) : null;
    
    if (savedScrollY && savedScrollY > 100) {
      hasAppliedScroll.current = true;
      window.scrollTo({ top: savedScrollY, left: 0, behavior: 'auto' });
    }
  }, [location.pathname]);

  // Reset flag when route changes
  useEffect(() => {
    hasAppliedScroll.current = false;
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background pb-20 pt-12">
      {children}
    </div>
  );
}
