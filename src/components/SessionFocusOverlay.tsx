import { useEffect } from 'react';
import { useGlint } from '@/contexts/GlintContext';

/**
 * A focus overlay that dramatically darkens the page during active practice sessions
 * to help users focus on the practice session and practice board.
 * Adds body class to darken background and elevate focused cards.
 */
export function SessionFocusOverlay() {
  const { hasActiveSession } = useGlint();

  // Add/remove class to body to control focus mode styling
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
    <>
      {/* Dark overlay covering content area */}
      <div 
        className="fixed inset-0 pointer-events-none transition-all duration-500 ease-out"
        style={{
          zIndex: 15,
          top: 0,
          bottom: 0,
          background: `
            linear-gradient(
              to bottom,
              hsl(var(--background) / 0) 0px,
              hsl(var(--background) / 0) 56px,
              hsl(0 0% 0% / 0.6) 56px,
              hsl(0 0% 0% / 0.7) 100%
            )
          `,
        }}
        aria-hidden="true"
      />
    </>
  );
}
