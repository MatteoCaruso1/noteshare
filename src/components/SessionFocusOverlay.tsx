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
    <div 
      className="fixed inset-0 pointer-events-none z-[5] transition-opacity duration-500"
      style={{
        background: `
          radial-gradient(
            ellipse 120% 50% at 50% 0%,
            transparent 0%,
            transparent 30%,
            hsla(var(--background) / 0.7) 70%,
            hsla(var(--background) / 0.85) 100%
          )
        `,
      }}
      aria-hidden="true"
    />
  );
}
