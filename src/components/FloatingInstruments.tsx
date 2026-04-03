import { useEffect, useState } from 'react';

const INSTRUMENTS = ['🎸', '🎹', '🎺', '🎻', '🥁', '🎷', '🎤', '🪕', '🎵', '🎶'];

interface FloatingEmoji {
  id: number;
  emoji: string;
  left: number;
  delay: number;
  duration: number;
  size: number;
}

export function FloatingInstruments() {
  const [emojis, setEmojis] = useState<FloatingEmoji[]>([]);

  useEffect(() => {
    const emojiCount = 9;
    
    // Far edges only: left 0-3% and right 97-100% to avoid overlap with static decorations
    const gutterPositions: number[] = [];
    const getGutterPosition = (index: number): number => {
      const isRight = index % 2 === 1;
      const base = isRight ? 94 : 0;
      const range = 5;
      let pos: number;
      let attempts = 0;
      do {
        pos = base + Math.random() * range;
        attempts++;
      } while (
        attempts < 20 &&
        gutterPositions.some(p => Math.abs(p - pos) < 2)
      );
      gutterPositions.push(pos);
      return pos;
    };
    
    const initialEmojis: FloatingEmoji[] = Array.from({ length: emojiCount }, (_, i) => ({
      id: i,
      emoji: INSTRUMENTS[Math.floor(Math.random() * INSTRUMENTS.length)],
      left: getGutterPosition(i),
      delay: (i * 5) + Math.random() * 12,
      duration: 60 + Math.random() * 40,
      size: 16 + Math.random() * 12,
    }));
    setEmojis(initialEmojis);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-[2]">
      {emojis.map((item) => (
        <div
          key={item.id}
          className="absolute opacity-[0.10] animate-float-down text-primary"
          style={{
            left: `${item.left}%`,
            top: 0,
            fontSize: `${item.size}px`,
            animationDelay: `${item.delay}s`,
            animationDuration: `${item.duration}s`,
            animationFillMode: 'both',
            filter: 'saturate(0.3) brightness(1.2)',
          }}
        >
          {item.emoji}
        </div>
      ))}
    </div>
  );
}
