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
    // Create a set of floating emojis with truly random distribution
    const emojiCount = 12;
    
    // Generate random positions ensuring good spread
    const usedPositions: number[] = [];
    const getRandomPosition = (): number => {
      let pos: number;
      let attempts = 0;
      do {
        pos = Math.random() * 90 + 5; // 5% to 95% to avoid edges
        attempts++;
        // Check if position is far enough from existing ones (at least 6% apart)
      } while (
        attempts < 20 && 
        usedPositions.some(p => Math.abs(p - pos) < 6)
      );
      usedPositions.push(pos);
      return pos;
    };
    
    const initialEmojis: FloatingEmoji[] = Array.from({ length: emojiCount }, (_, i) => ({
      id: i,
      emoji: INSTRUMENTS[Math.floor(Math.random() * INSTRUMENTS.length)],
      left: getRandomPosition(),
      // Stagger delays more to avoid clustering
      delay: (i * 3) + Math.random() * 8,
      duration: 25 + Math.random() * 20,
      size: 16 + Math.random() * 12,
    }));
    setEmojis(initialEmojis);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {emojis.map((item) => (
        <div
          key={item.id}
          className="absolute opacity-[0.05] animate-float-down grayscale"
          style={{
            left: `${item.left}%`,
            fontSize: `${item.size}px`,
            animationDelay: `${item.delay}s`,
            animationDuration: `${item.duration}s`,
          }}
        >
          {item.emoji}
        </div>
      ))}
    </div>
  );
}
