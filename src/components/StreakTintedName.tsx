import { memo } from 'react';
import { getStreakTier, STREAK_TIERS, StreakTierInfo } from '@/lib/streakUtils';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TrophyBadge } from '@/components/shared/TrophyBadge';

interface StreakTintedNameProps {
  name: string;
  streakDays?: number;
  bestAchievedMilestone?: number;
  achievementCount?: number;
  className?: string;
}

/**
 * Gets the tier info for a specific milestone value
 */
function getTierForMilestone(milestone: number): StreakTierInfo {
  for (const tier of STREAK_TIERS) {
    if (milestone >= tier.minDays && tier.tier !== 'none') {
      return tier;
    }
  }
  return STREAK_TIERS[STREAK_TIERS.length - 1]; // 'none' tier
}

/**
 * Displays a name with a subtle streak badge icon next to it
 * Badge shows the BEST tier ever achieved (permanent), not just current streak
 * All tiers use Trophy icon with different colors, with achievement count engraved
 */
export const StreakTintedName = memo(function StreakTintedName({
  name,
  streakDays = 0,
  bestAchievedMilestone,
  achievementCount,
  className,
}: StreakTintedNameProps) {
  // Determine which tier to display:
  // 1. If bestAchievedMilestone is provided, use that (permanent best)
  // 2. Otherwise fall back to current streak tier
  const currentTier = getStreakTier(streakDays);
  
  // Use the best achieved milestone if available, otherwise use current streak tier
  const displayTier = bestAchievedMilestone 
    ? getTierForMilestone(bestAchievedMilestone)
    : currentTier;
  
  // Get the achievement count for the displayed tier
  const dbCount = achievementCount || 0;
  
  // Always show at least 1 if we're displaying a badge (means they achieved it)
  const displayCount = displayTier.tier !== 'none' ? Math.max(dbCount, 1) : 0;
  
  const showBadge = displayTier.tier !== 'none';
  
  const badge = !showBadge ? null : (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex cursor-default">
            <TrophyBadge tier={displayTier} count={displayCount} />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {displayTier.minDays}+ day streak{displayCount > 0 ? ` (${displayCount}x)` : ''}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
  
  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      {name}
      {badge}
    </span>
  );
});
