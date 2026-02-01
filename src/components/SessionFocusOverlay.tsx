import { useEffect } from 'react';
import { useGlint } from '@/contexts/GlintContext';

/**
 * A focus overlay that dramatically darkens the page during active practice sessions
 * to help users focus on the practice session and practice board.
 * Adds body class to darken background and elevate focused cards.
 * All visual effects are CSS-based for smooth transitions.
 */
export function SessionFocusOverlay() {
  const { hasActiveSession } = useGlint();

  // Add/remove class to body to control focus mode styling
  // CSS handles all the visual transitions smoothly
  useEffect(() => {
    if (hasActiveSession) {
      document.body.classList.add('session-active');
    } else {
      document.body.classList.remove('session-active');
    }
    return () => {
      document.body.classList.remove('session-active');
    };
  }, [hasActiveSession]);

  // All effects are CSS-based via body.session-active class
  // No overlay div needed - prevents hard edges and split backgrounds
  return null;
}
