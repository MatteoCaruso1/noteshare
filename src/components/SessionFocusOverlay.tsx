import { useEffect } from 'react';
import { useGlint } from '@/contexts/GlintContext';

/**
 * A vignette overlay that darkens the page during active practice sessions
 * to help users focus on the practice session and practice board.
 * Uses CSS classes to elevate focused cards above the overlay.
 */
export function SessionFocusOverlay() {
  const { hasActiveSession } = useGlint();

  // Add/remove class to body to control card z-index
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

  if (!hasActiveSession) return null;

  return (
    <div 
      className="fixed inset-0 pointer-events-none transition-opacity duration-300"
      style={{
        zIndex: 15,
        top: '56px', // Below header
        bottom: '64px', // Above bottom nav
        background: 'hsl(var(--background) / 0.8)',
      }}
      aria-hidden="true"
    />
  );
}
