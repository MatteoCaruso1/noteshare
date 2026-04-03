import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

const SYMBOLS = ['♪', '♫', '♬', '♩', '𝄞', '♭', '♯', '𝄢'];

interface FloatingSymbol {
  id: number;
  symbol: string;
  left: number;
  delay: number;
  duration: number;
  size: number;
  rotateStart: number;
  rotateMid: number;
  rotateEnd: number;
}

function generateSymbols(isLanding: boolean): FloatingSymbol[] {
  const count = 9;
  const positions: number[] = [];

  const getPosition = (): number => {
    let pos: number;
    let attempts = 0;
    do {
      if (isLanding) {
        pos = 15 + Math.random() * 70;
      } else {
        const isRight = Math.random() > 0.5;
        pos = isRight ? 72 + Math.random() * 23 : 5 + Math.random() * 23;
      }
      attempts++;
    } while (
      attempts < 20 &&
      positions.some(p => Math.abs(p - pos) < 6)
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
    return {
      id: i,
      symbol: SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
      left: getPosition(),
      delay: (i * 5) + Math.random() * 12,
      duration: 60 + Math.random() * 40,
      size: 18 + Math.random() * 14,
      rotateStart: rot.start,
      rotateMid: rot.mid,
      rotateEnd: rot.end,
    };
  });
}

export function FloatingInstruments() {
  const [symbols, setSymbols] = useState<FloatingSymbol[]>([]);
  const location = useLocation();
  const isLanding = location.pathname === '/welcome';

  useEffect(() => {
    setSymbols(generateSymbols(isLanding));
  }, [isLanding]);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-[8]">
      {symbols.map((item) => (
        <div
          key={item.id}
          className="absolute opacity-[0.08] animate-float-down text-primary select-none"
          style={{
            left: `${item.left}%`,
            top: 0,
            fontSize: `${item.size}px`,
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
  );
}
