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
    const emojiCount = 12;
    
    // Constrain to left (2-18%) and right (82-98%) gutters
    const gutterPositions: number[] = [];
    const getGutterPosition = (index: number): number => {
      const isRight = index % 2 === 1;
      const base = isRight ? 82 : 2;
      const range = 16; // 2-18 or 82-98
      let pos: number;
      let attempts = 0;
      do {
        pos = base + Math.random() * range;
        attempts++;
      } while (
        attempts < 20 &&
        gutterPositions.some(p => Math.abs(p - pos) < 4)
      );
      gutterPositions.push(pos);
      return pos;
    };
    
    const initialEmojis: FloatingEmoji[] = Array.from({ length: emojiCount }, (_, i) => ({
      id: i,
      emoji: INSTRUMENTS[Math.floor(Math.random() * INSTRUMENTS.length)],
      left: getGutterPosition(i),
      delay: (i * 3) + Math.random() * 8,
      duration: 25 + Math.random() * 20,
      size: 16 + Math.random() * 12,
    }));
    setEmojis(initialEmojis);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-[15]">
      {emojis.map((item) => (
        <div
          key={item.id}
          className="absolute opacity-[0.10] animate-float-down grayscale"
          style={{
            left: `${item.left}%`,
            top: 0,
            fontSize: `${item.size}px`,
            animationDelay: `${item.delay}s`,
            animationDuration: `${item.duration}s`,
            animationFillMode: 'both',
          }}
        >
          {item.emoji}
        </div>
      ))}
    </div>
  );
}
