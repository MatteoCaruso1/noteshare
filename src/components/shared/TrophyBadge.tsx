import { memo } from 'react';
import { Trophy } from 'lucide-react';
import { StreakTierInfo } from '@/lib/streakUtils';

interface TrophyBadgeProps {
  tier: StreakTierInfo;
  count?: number;
  className?: string;
}

/**
 * Standardized trophy badge with count overlay
 * Used across StreakTintedName and StreakBadges for consistent rendering
 */
export const TrophyBadge = memo(function TrophyBadge({ 
  tier, 
  count,
  className = ''
}: TrophyBadgeProps) {
  if (tier.tier === 'none') return null;
  
  const displayCount = count && count > 0 
    ? (count > 99 ? '99+' : count) 
    : null;
  
  return (
    <span className={`relative inline-flex items-center justify-center w-3.5 h-3.5 ${className}`}>
      <Trophy className={`w-3.5 h-3.5 ${tier.colorClass} opacity-80`} />
      {displayCount && (
        <span 
          className={`absolute inset-0 flex items-center justify-center text-[6px] font-bold -translate-x-[0.5px] -translate-y-[2px] ${tier.colorClass}`}
          style={{ textShadow: '0 0 2px hsl(var(--background))' }}
        >
          {displayCount}
        </span>
      )}
    </span>
  );
});
