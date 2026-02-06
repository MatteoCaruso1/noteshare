import { ReactNode, useState, useEffect, useRef, useLayoutEffect, createContext, useContext } from 'react';
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

// Context to share page transition state across the app
interface PageTransitionContextType {
  isTransitioning: boolean;
}

const PageTransitionContext = createContext<PageTransitionContextType>({ isTransitioning: false });

export function usePageTransition() {
  return useContext(PageTransitionContext);
}

/**
 * PageTransitionProvider - Wraps the entire app to provide smooth page transitions.
 * Uses useLayoutEffect to set opacity to 0 BEFORE browser paint on route change,
 * preventing the flash of new content before fade animation.
 */
export function PageTransitionProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const prevPathRef = useRef(location.pathname);
  const isFirstRender = useRef(true);
  
  // Skip blur for performance-critical pages
  const skipBlur = location.pathname === '/friends';

  // useLayoutEffect runs BEFORE browser paint - critical for preventing flash
  useLayoutEffect(() => {
    // Skip first render to avoid fade-in on initial page load
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    
    // On route change, immediately hide before paint
    if (location.pathname !== prevPathRef.current) {
      prevPathRef.current = location.pathname;
      setIsTransitioning(true);
      setIsVisible(false);
    }
  }, [location.pathname]);

  // useEffect for the delayed fade-in (runs after paint)
  useEffect(() => {
    if (!isVisible && !isFirstRender.current) {
      // Fade back in after a short delay
      const timer = setTimeout(() => {
        setIsVisible(true);
        // End transition state after fade completes
        setTimeout(() => setIsTransitioning(false), 200);
      }, 80);
      
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  return (
    <PageTransitionContext.Provider value={{ isTransitioning }}>
      <div
        className="page-transition-wrapper"
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
    </PageTransitionContext.Provider>
  );
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
 * PageBody - Content area wrapper.
 * The actual transition effect is now handled by PageTransitionProvider at the app level.
 */
export function PageBody({ children, className = '' }: PageBodyProps) {
  return (
    <div className={`page-body ${className}`}>
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
