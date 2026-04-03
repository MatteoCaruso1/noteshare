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
}

function generateSymbols(isLanding: boolean): FloatingSymbol[] {
  const count = 9;
  const positions: number[] = [];

  const getPosition = (): number => {
    let pos: number;
    let attempts = 0;
    do {
      if (isLanding) {
        // Landing page: full center spread (15-85%)
        pos = 15 + Math.random() * 70;
      } else {
        // App pages: two lanes between static decorations and content
        // Left lane: 5-28%, Right lane: 72-95%
        const isRight = Math.random() > 0.5;
        if (isRight) {
          pos = 72 + Math.random() * 23;
        } else {
          pos = 5 + Math.random() * 23;
        }
      }
      attempts++;
    } while (
      attempts < 20 &&
      positions.some(p => Math.abs(p - pos) < 6)
    );
    positions.push(pos);
    return pos;
  };

  return Array.from({ length: count }, (_, i) => ({
    id: i,
    symbol: SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
    left: getPosition(),
    delay: (i * 5) + Math.random() * 12,
    duration: 60 + Math.random() * 40,
    size: 18 + Math.random() * 14,
  }));
}

export function FloatingInstruments() {
  const [symbols, setSymbols] = useState<FloatingSymbol[]>([]);
  const location = useLocation();
  const isLanding = location.pathname === '/welcome';

  useEffect(() => {
    setSymbols(generateSymbols(isLanding));
  }, [isLanding]);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-[2]">
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
          }}
          aria-hidden="true"
        >
          {item.symbol}
        </div>
      ))}
    </div>
  );
}
