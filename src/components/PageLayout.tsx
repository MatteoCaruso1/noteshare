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
    // On route change, reset visibility and animate in
    if (location.pathname !== prevPathRef.current) {
      prevPathRef.current = location.pathname;
      setIsVisible(false);
      
      // Delay before starting animation
      const delayTimer = setTimeout(() => {
        setIsVisible(true);
      }, 120);

      return () => clearTimeout(delayTimer);
    } else if (initialMount.current) {
      // Initial mount - animate in after delay
      initialMount.current = false;
      const delayTimer = setTimeout(() => {
        setIsVisible(true);
      }, 120);

      return () => clearTimeout(delayTimer);
    }
  }, [location.pathname]);

  return (
    <div
      className={`page-body ${className}`}
      style={{
        opacity: isVisible ? 1 : 0,
        filter: isVisible ? 'blur(0px)' : 'blur(4px)',
        transition: 'opacity 280ms ease-out, filter 280ms ease-out',
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
