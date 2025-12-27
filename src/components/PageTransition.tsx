import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

interface PageTransitionProps {
  children: React.ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(true);
  const [displayedChildren, setDisplayedChildren] = useState(children);

  useEffect(() => {
    // When route changes, fade out briefly
    setIsVisible(false);
    
    // After fade out, swap content and fade back in
    const timeout = setTimeout(() => {
      setDisplayedChildren(children);
      setIsVisible(true);
    }, 75); // Half of the transition for smooth feel

    return () => clearTimeout(timeout);
  }, [location.pathname]);

  // Update children immediately if they change for same route
  useEffect(() => {
    if (isVisible) {
      setDisplayedChildren(children);
    }
  }, [children, isVisible]);

  return (
    <div
      className="transition-opacity duration-150 ease-out"
      style={{ opacity: isVisible ? 1 : 0 }}
    >
      {displayedChildren}
    </div>
  );
}
