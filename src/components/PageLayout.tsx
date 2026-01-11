import { ReactNode, useEffect, useState, useRef, useLayoutEffect } from 'react';
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
 * PageBody - Animated content area that fades/slides in after a short delay.
 * Animation: opacity 0→1, translateY(6px)→0
 * Delay: 140ms, Duration: 220ms
 */
export function PageBody({ children, className = '' }: PageBodyProps) {
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(false);
  const prevPathRef = useRef(location.pathname);
  const initialMount = useRef(true);

  useEffect(() => {
    // On route change, reset visibility and animate in
    if (location.pathname !== prevPathRef.current) {
      prevPathRef.current = location.pathname;
      setIsVisible(false);
      
      // Delay before starting animation
      const delayTimer = setTimeout(() => {
        setIsVisible(true);
      }, 140);

      return () => clearTimeout(delayTimer);
    } else if (initialMount.current) {
      // Initial mount - animate in after delay
      initialMount.current = false;
      const delayTimer = setTimeout(() => {
        setIsVisible(true);
      }, 140);

      return () => clearTimeout(delayTimer);
    }
  }, [location.pathname]);

  return (
    <div
      className={`page-body ${className}`}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(6px)',
        transition: 'opacity 220ms cubic-bezier(0.2, 0, 0, 1), transform 220ms cubic-bezier(0.2, 0, 0, 1)',
      }}
    >
      {children}
    </div>
  );
}

// Map route paths to scroll restoration keys
function getScrollKeyForPath(pathname: string): string | null {
  if (pathname === '/') return 'home-timeline';
  if (pathname === '/friends') return 'friends-timeline';
  if (pathname === '/projects') return 'projects';
  if (pathname === '/working-toward') return 'working-toward';
  return null;
}

/**
 * PageLayout - Wrapper for page content.
 * Handles preventing header flash when restoring scroll position.
 */
export function PageLayout({ children }: PageLayoutProps) {
  const location = useLocation();
  const [isReady, setIsReady] = useState(false);
  const hasAppliedScroll = useRef(false);
  
  // Check if we need to restore scroll position before first paint
  useLayoutEffect(() => {
    const scrollKey = getScrollKeyForPath(location.pathname);
    const savedScrollY = scrollKey ? getSavedScrollPosition(scrollKey) : null;
    
    if (savedScrollY && savedScrollY > 100 && !hasAppliedScroll.current) {
      // We have a significant scroll position to restore
      // Apply it immediately and then show content
      hasAppliedScroll.current = true;
      window.scrollTo({ top: savedScrollY, left: 0, behavior: 'auto' });
      // Show content after scroll is applied
      requestAnimationFrame(() => {
        setIsReady(true);
      });
    } else {
      // No scroll to restore or already at top, show immediately
      setIsReady(true);
    }
  }, [location.pathname]);

  // Reset when route changes
  useEffect(() => {
    hasAppliedScroll.current = false;
  }, [location.pathname]);

  return (
    <div 
      className="min-h-screen bg-background pb-20 pt-12"
      style={{
        visibility: isReady ? 'visible' : 'hidden',
      }}
    >
      {children}
    </div>
  );
}
