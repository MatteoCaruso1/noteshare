import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  useBackgroundCustomization,
  getPackSymbols,
  getDensityCount,
} from '@/contexts/BackgroundCustomizationContext';
import { useGlint } from '@/contexts/GlintContext';

const DEFAULT_SYMBOLS = ['♪', '♫', '♬', '♩', '𝄞', '♭', '♯', '𝄢'];

// Routes where ambient decorations should not render at all.
const SUPPRESSED_PREFIXES = ['/auth', '/blog', '/ftue', '/qr'];

interface FloatingSymbol {
  id: number;
  symbol: string;
  isEmoji: boolean;
  left: number;
  delay: number;
  duration: number;
  size: number;
  opacity: number;
  rotateStart: number;
  rotateMid: number;
  rotateEnd: number;
}

interface GutterOrb {
  id: number;
  side: 'left' | 'right';
  topPct: number;
  size: number;
  hue: number;
  blur: number;
  opacity: number;
}

function generateSymbols(
  isLanding: boolean,
  isDesktop: boolean,
  symbolSet: string[],
  count: number,
): FloatingSymbol[] {
  if (count <= 0 || symbolSet.length === 0) return [];
  const positions: number[] = [];

  const getPosition = (): number => {
    let pos: number;
    let attempts = 0;
    do {
      if (isLanding) {
        pos = 15 + Math.random() * 70;
      } else if (isDesktop) {
        // On desktop the side gutters are wide — spread symbols across them
        // with a comfortable inset from the page edge.
        const isRight = Math.random() > 0.5;
        pos = isRight ? 70 + Math.random() * 26 : 4 + Math.random() * 26;
      } else {
        const isRight = Math.random() > 0.5;
        pos = isRight ? 72 + Math.random() * 23 : 5 + Math.random() * 23;
      }
      attempts++;
    } while (
      attempts < 20 &&
      positions.some(p => Math.abs(p - pos) < (isDesktop ? 5 : 6))
    );
    positions.push(pos);
    return pos;
  };

  const getRotation = () => {
    if (Math.random() < 0.65) {
      const start = (Math.random() - 0.5) * 60;
      const mid = start + (Math.random() - 0.5) * 40;
      const end = start - (Math.random() - 0.5) * 40;
      return { start, mid, end };
    }
    const start = Math.random() * 360;
    const mid = start + (Math.random() - 0.5) * 120;
    const end = start + (Math.random() - 0.5) * 180;
    return { start, mid, end };
  };

  return Array.from({ length: count }, (_, i) => {
    const rot = getRotation();
    const symbol = symbolSet[Math.floor(Math.random() * symbolSet.length)];

    // Desktop sizes are noticeably larger and a touch more opaque so the
    // sides of Practice/Social/Profile feel intentional and rich.
    const size = isDesktop
      ? 40 + Math.random() * 35
      : 18 + Math.random() * 14;

    const opacity = isDesktop ? 0.16 + Math.random() * 0.09 : 0.08;

    return {
      id: i,
      symbol,
      isEmoji: false,
      left: getPosition(),
      delay: (i * 4) + Math.random() * 12,
      duration: 130 + Math.random() * 70,
      size,
      opacity,
      rotateStart: rot.start,
      rotateMid: rot.mid,
      rotateEnd: rot.end,
    };
  });
}

function generateOrbs(): GutterOrb[] {
  // A small set of soft gradient orbs anchored in the desktop gutters that
  // add depth without competing with content. They are static (no animation)
  // to stay performant.
  const orbs: GutterOrb[] = [];
  const sides: Array<'left' | 'right'> = ['left', 'right'];
  let id = 0;
  for (const side of sides) {
    const count = 4;
    for (let i = 0; i < count; i++) {
      orbs.push({
        id: id++,
        side,
        topPct: 5 + i * 24 + Math.random() * 6,
        size: 350 + Math.random() * 275,
        // Use the project primary hue range with gentle variation
        hue: 200 + Math.random() * 40,
        blur: 110 + Math.random() * 50,
        opacity: 0.13 + Math.random() * 0.07,
      });
    }
  }
  return orbs;
}

export function FloatingInstruments() {
  const [symbols, setSymbols] = useState<FloatingSymbol[]>([]);
  const [orbs, setOrbs] = useState<GutterOrb[]>([]);
  const [isDesktop, setIsDesktop] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : false,
  );
  const location = useLocation();
  const containerRef = useRef<HTMLDivElement>(null);
  const isLanding = location.pathname === '/welcome';
  const isSuppressed = SUPPRESSED_PREFIXES.some(p => location.pathname.startsWith(p));
  const { pack, density } = useBackgroundCustomization();
  const { hasActiveSession } = useGlint();

  // Track desktop vs mobile so we can render a richer layer on wide screens
  // without affecting the tuned mobile experience.
  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (isSuppressed) {
      setSymbols([]);
      setOrbs([]);
      return;
    }
    // Landing page always shows the default music symbols at full density
    const symbolSet = isLanding ? DEFAULT_SYMBOLS : getPackSymbols(pack);
    const baseCount = isLanding ? 9 : getDensityCount(density);
    // Boost count on desktop so the wide gutters don't feel empty
    const count = !isLanding && isDesktop ? Math.round(baseCount * 2.25) : baseCount;
    setSymbols(generateSymbols(isLanding, isDesktop, symbolSet, count));
    setOrbs(!isLanding && isDesktop ? generateOrbs() : []);
  }, [isLanding, isSuppressed, pack, density, isDesktop]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (!isLanding) {
      container.style.maskImage = '';
      container.style.webkitMaskImage = '';
      return;
    }

    const updateLandingMask = () => {
      const divider = document.querySelector<HTMLElement>('[data-landing-divider]');
      const activeContainer = containerRef.current;
      if (!divider || !activeContainer) return;

      const viewportHeight = window.innerHeight;
      const dividerTop = Math.max(0, Math.min(viewportHeight, divider.getBoundingClientRect().top));
      // Offset upward so emojis vanish right at the visible color break, not after
      const fadeStart = Math.max(0, dividerTop - 40);
      const fadeEnd = Math.max(0, dividerTop - 10);
      const mask = `linear-gradient(to bottom, black 0px, black ${fadeStart}px, transparent ${fadeEnd}px, transparent 100%)`;

      activeContainer.style.maskImage = mask;
      activeContainer.style.webkitMaskImage = mask;
    };

    updateLandingMask();
    window.addEventListener('scroll', updateLandingMask, { passive: true });
    window.addEventListener('resize', updateLandingMask);

    return () => {
      window.removeEventListener('scroll', updateLandingMask);
      window.removeEventListener('resize', updateLandingMask);
    };
  }, [isLanding]);

  if (isSuppressed) return null;

  return (
    <>
      {/* Desktop-only soft gradient orbs anchored in the side gutters.
          They add depth and a sense of polish without competing with content. */}
      {orbs.length > 0 && (
        <div
          className="hidden lg:block fixed inset-0 pointer-events-none overflow-hidden z-[10.4]"
          aria-hidden="true"
        >
          {orbs.map(orb => (
            <div
              key={orb.id}
              className="absolute rounded-full"
              style={{
                top: `${orb.topPct}%`,
                [orb.side]: `-${Math.round(orb.size * 0.35)}px`,
                width: `${orb.size}px`,
                height: `${orb.size}px`,
                background: `radial-gradient(circle at center, hsl(${orb.hue} 80% 60% / ${orb.opacity}) 0%, hsl(${orb.hue} 80% 60% / 0) 70%)`,
                filter: `blur(${orb.blur}px)`,
              } as React.CSSProperties}
            />
          ))}
        </div>
      )}

      <div
        ref={containerRef}
        className="fixed inset-0 pointer-events-none overflow-hidden z-[10.5]"
      >
        {symbols.map((item) => (
          <div
            key={item.id}
            className={
              'absolute animate-float-down select-none ' +
              (item.isEmoji ? 'emoji-text' : 'text-primary emoji-text')
            }
            style={{
              left: `${item.left}%`,
              top: 0,
              fontSize: `${item.size}px`,
              opacity: item.opacity,
              animationDelay: `${item.delay}s`,
              animationDuration: `${item.duration}s`,
              animationFillMode: 'both',
              '--float-rotate-start': `${item.rotateStart}deg`,
              '--float-rotate-mid': `${item.rotateMid}deg`,
              '--float-rotate-end': `${item.rotateEnd}deg`,
            } as React.CSSProperties}
            aria-hidden="true"
          >
            {item.symbol}
          </div>
        ))}
      </div>
    </>
  );
}
