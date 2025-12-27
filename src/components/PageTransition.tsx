import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';

interface PageTransitionProps {
  children: React.ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation();
  const [opacity, setOpacity] = useState(1);
  const prevPathRef = useRef(location.pathname);

  useEffect(() => {
    // Only trigger fade on actual route changes
    if (location.pathname !== prevPathRef.current) {
      prevPathRef.current = location.pathname;
      
      // Start at 0 opacity and fade in
      setOpacity(0);
      
      // Use requestAnimationFrame to ensure the opacity:0 is painted first
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setOpacity(1);
        });
      });
    }
  }, [location.pathname]);

  return (
    <div
      style={{
        opacity,
        transition: 'opacity 150ms ease-out',
      }}
    >
      {children}
    </div>
  );
}
