import { useState } from 'react';
import { cn } from '@/lib/utils';
import { JAZZ_REACTIONS, JazzReaction } from '@/types';

interface JazzReactionsProps {
  reactions: Record<JazzReaction, number>;
  userReaction?: JazzReaction;
  onReact: (reaction: JazzReaction) => void;
  size?: 'sm' | 'md';
}

export function JazzReactions({ reactions, userReaction, onReact, size = 'md' }: JazzReactionsProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [animatingReaction, setAnimatingReaction] = useState<JazzReaction | null>(null);

  const totalReactions = Object.values(reactions).reduce((a, b) => a + b, 0);

  const handleReact = (reaction: JazzReaction) => {
    setAnimatingReaction(reaction);
    onReact(reaction);
    setShowPicker(false);
    setTimeout(() => setAnimatingReaction(null), 400);
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        {/* Main reaction button */}
        <button
          onClick={() => setShowPicker(!showPicker)}
          onMouseEnter={() => setShowPicker(true)}
          onMouseLeave={() => setShowPicker(false)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-200',
            'bg-secondary/50 hover:bg-secondary border border-border/50',
            userReaction && 'border-jazz-gold/50 bg-jazz-gold/10',
            size === 'sm' && 'px-2 py-1 text-sm'
          )}
        >
          <span className={cn(
            'text-base transition-transform',
            animatingReaction && 'reaction-bounce',
            size === 'sm' && 'text-sm'
          )}>
            {userReaction || '🎷'}
          </span>
          <span className={cn(
            'text-muted-foreground font-medium',
            size === 'sm' ? 'text-xs' : 'text-sm'
          )}>
            {totalReactions}
          </span>
        </button>

        {/* Reaction picker */}
        {showPicker && (
          <div
            className="absolute bottom-full left-0 mb-2 flex items-center gap-1 p-2 bg-card border border-border rounded-full shadow-elevated animate-scaleIn"
            onMouseEnter={() => setShowPicker(true)}
            onMouseLeave={() => setShowPicker(false)}
          >
            {JAZZ_REACTIONS.map((reaction) => (
              <button
                key={reaction}
                onClick={() => handleReact(reaction)}
                className={cn(
                  'p-2 rounded-full hover:bg-secondary transition-all duration-150 hover:scale-125',
                  userReaction === reaction && 'bg-jazz-gold/20'
                )}
              >
                <span className="text-xl">{reaction}</span>
              </button>
            ))}
          </div>
        )}

        {/* Show top reactions */}
        <div className="hidden sm:flex items-center gap-1">
          {JAZZ_REACTIONS.filter(r => reactions[r] > 0)
            .sort((a, b) => reactions[b] - reactions[a])
            .slice(0, 3)
            .map((reaction) => (
              <span
                key={reaction}
                className="flex items-center gap-0.5 text-xs text-muted-foreground"
              >
                <span>{reaction}</span>
                <span>{reactions[reaction]}</span>
              </span>
            ))}
        </div>
      </div>
    </div>
  );
}
