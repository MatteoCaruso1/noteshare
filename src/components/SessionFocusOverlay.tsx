import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useActiveSession } from '@/hooks/useSessions';

/**
 * A global focus overlay that manages the session-active class on <body>.
 * This component should be rendered ONCE at the app root level (inside AuthProvider)
 * so the class persists across route transitions—preventing visual artifacts
 * caused by rapid class toggles during page navigation.
 * 
 * All visual effects are CSS-based via body.session-active class.
 * No overlay div is rendered—prevents hard edges and split backgrounds.
 * 
 * EXCLUDED PAGES: /welcome, /auth - these pages should not show focus mode styling.
 */
export function SessionFocusOverlay() {
  const { profile } = useAuth();
  const location = useLocation();
  const activeSessionQuery = useActiveSession(profile?.id);
  const [hasActiveSession, setHasActiveSession] = useState(false);

  // Pages that should not show focus mode styling
  const excludedPaths = ['/welcome', '/auth'];
  const isExcludedPage = excludedPaths.includes(location.pathname);

  // Derive session state from the actual active session data
  useEffect(() => {
    const session = activeSessionQuery.data;
    const isActive = !!session && session.is_active;
    setHasActiveSession(isActive);
  }, [activeSessionQuery.data]);

  // Add/remove class to body to control focus mode styling
  // CSS handles all the visual transitions smoothly
  // Don't apply on excluded pages (landing, auth)
  useEffect(() => {
    if (hasActiveSession && !isExcludedPage) {
      document.body.classList.add('session-active');
    } else {
      document.body.classList.remove('session-active');
    }
    return () => {
      document.body.classList.remove('session-active');
    };
  }, [hasActiveSession, isExcludedPage]);

  // All effects are CSS-based via body.session-active class
  // No overlay div needed - prevents hard edges and split backgrounds
  return null;
}
