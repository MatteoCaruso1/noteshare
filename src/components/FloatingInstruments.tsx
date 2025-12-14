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
    // Create a set of floating emojis with even distribution across the page
    const columns = 12;
    const columnWidth = 100 / columns;
    
    const initialEmojis: FloatingEmoji[] = Array.from({ length: 12 }, (_, i) => ({
      id: i,
      emoji: INSTRUMENTS[Math.floor(Math.random() * INSTRUMENTS.length)],
      // Distribute evenly across columns with small random offset within each column
      left: (i % columns) * columnWidth + Math.random() * (columnWidth * 0.6),
      delay: Math.random() * 20,
      duration: 25 + Math.random() * 15,
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
