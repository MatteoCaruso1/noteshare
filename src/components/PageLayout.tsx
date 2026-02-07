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
  const [isVisible, setIsVisible] = useState(false); // Start hidden for initial fade-in
  const prevPathRef = useRef(location.pathname);
  const isInitialMount = useRef(true);
  
  // Skip blur for performance-critical pages
  const skipBlur = location.pathname === '/friends';

  useEffect(() => {
    // Initial mount - fade in immediately
    if (isInitialMount.current) {
      isInitialMount.current = false;
      // Small delay to ensure DOM is ready, then fade in
      requestAnimationFrame(() => {
        setIsVisible(true);
      });
      return;
    }

    // On route change, briefly fade out then fade back in
    if (location.pathname !== prevPathRef.current) {
      prevPathRef.current = location.pathname;
      setIsVisible(false); // Trigger fade out
      
      // After fade out, fade back in
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 80); // Short delay for subtle transition
      
      return () => clearTimeout(timer);
    }
  }, [location.pathname]);

  return (
    <div
      className={`page-body ${className}`}
      style={{
        opacity: isVisible ? 1 : 0,
        filter: isVisible ? 'none' : (skipBlur ? 'none' : 'blur(2px)'),
        transition: skipBlur 
          ? 'opacity 150ms ease-out' 
          : 'opacity 180ms cubic-bezier(0.4, 0, 0.2, 1), filter 180ms cubic-bezier(0.4, 0, 0.2, 1)',
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
