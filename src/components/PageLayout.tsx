import { ReactNode, useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';

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
    <div className={`page-header ${className}`}>
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

/**
 * PageLayout - Wrapper for page content.
 * Does not animate itself - nav bars remain outside this component.
 */
export function PageLayout({ children }: PageLayoutProps) {
  return (
    <div className="min-h-screen bg-background pb-20">
      {children}
    </div>
  );
}
