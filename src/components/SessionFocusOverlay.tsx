import { useGlint } from '@/contexts/GlintContext';

/**
 * A vignette overlay that darkens the page during active practice sessions
 * to help users focus on the practice session and practice board.
 * The header and bottom nav are excluded via z-index layering.
 */
export function SessionFocusOverlay() {
  const { hasActiveSession } = useGlint();

  if (!hasActiveSession) return null;

  return (
    <>
      {/* Top vignette - fades from transparent at top to dark */}
      <div 
        className="fixed left-0 right-0 pointer-events-none z-[5] transition-opacity duration-500"
        style={{
          top: '56px', // Below header
          height: '100px',
          background: 'linear-gradient(to bottom, transparent 0%, hsl(var(--background) / 0.6) 100%)',
        }}
        aria-hidden="true"
      />
      
      {/* Bottom vignette - dark overlay over lower content */}
      <div 
        className="fixed left-0 right-0 pointer-events-none z-[5] transition-opacity duration-500"
        style={{
          top: '156px', // After top vignette
          bottom: '64px', // Above bottom nav
          background: 'hsl(var(--background) / 0.75)',
        }}
        aria-hidden="true"
      />
      
      {/* Bottom fade to nav */}
      <div 
        className="fixed left-0 right-0 pointer-events-none z-[5] transition-opacity duration-500"
        style={{
          bottom: '64px',
          height: '60px',
          background: 'linear-gradient(to bottom, hsl(var(--background) / 0.75) 0%, transparent 100%)',
        }}
        aria-hidden="true"
      />
    </>
  );
}
