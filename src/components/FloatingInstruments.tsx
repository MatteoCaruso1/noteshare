import { useEffect, useState } from 'react';

// Text musical symbols that respond to CSS color (unlike emojis)
const SYMBOLS = ['♪', '♫', '♬', '♩', '𝄞', '♭', '♯', '𝄢'];

interface FloatingSymbol {
  id: number;
  symbol: string;
  left: number;
  delay: number;
  duration: number;
  size: number;
}

export function FloatingInstruments() {
  const [symbols, setSymbols] = useState<FloatingSymbol[]>([]);

  useEffect(() => {
    const count = 9;
    
    // Position at very far edges, partially off-screen, to avoid overlapping
    // with static decorations (which sit at ~left-2 to left-12 / right-3 to right-14)
    const positions: number[] = [];
    const getEdgePosition = (index: number): number => {
      const isRight = index % 2 === 1;
      // Left: -2% to 0%, Right: 98% to 100%
      const base = isRight ? 97 : -2;
      const range = 3;
      let pos: number;
      let attempts = 0;
      do {
        pos = base + Math.random() * range;
        attempts++;
      } while (
        attempts < 20 &&
        positions.some(p => Math.abs(p - pos) < 1.5)
      );
      positions.push(pos);
      return pos;
    };
    
    const initial: FloatingSymbol[] = Array.from({ length: count }, (_, i) => ({
      id: i,
      symbol: SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
      left: getEdgePosition(i),
      delay: (i * 5) + Math.random() * 12,
      duration: 60 + Math.random() * 40,
      size: 18 + Math.random() * 14,
    }));
    setSymbols(initial);
  }, []);

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
