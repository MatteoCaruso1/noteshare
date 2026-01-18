import { memo } from 'react';
import { StreakTierInfo } from '@/lib/streakUtils';
import { TrophyWithNumber } from './TrophyWithNumber';

interface TrophyBadgeProps {
  tier: StreakTierInfo;
  count?: number;
  size?: number;
  className?: string;
}

/**
 * Standardized trophy badge with count overlay
 * Now uses SVG-based TrophyWithNumber for consistent rendering
 */
export const TrophyBadge = memo(function TrophyBadge({ 
  tier, 
  count,
  size = 14,
  className = ''
}: TrophyBadgeProps) {
  return (
    <TrophyWithNumber 
      tier={tier} 
      count={count} 
      size={size}
      className={className}
    />
  );
});
