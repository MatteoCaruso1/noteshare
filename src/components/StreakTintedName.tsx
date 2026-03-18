import { memo } from 'react';
import { getStreakTier, STREAK_TIERS, StreakTierInfo } from '@/lib/streakUtils';
import { getAwardById, AwardTier } from '@/lib/awardUtils';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TrophyBadge } from '@/components/shared/TrophyBadge';
import { AwardIcon } from '@/components/shared/AwardIcon';

interface StreakTintedNameProps {
  name: string;
  streakDays?: number;
  bestAchievedMilestone?: number;
  achievementCount?: number;
  selectedAward?: string | null;
  className?: string;
}

function getTierForMilestone(milestone: number): StreakTierInfo {
  for (const tier of STREAK_TIERS) {
    if (milestone >= tier.minDays && tier.tier !== 'none') {
      return tier;
    }
  }
  return STREAK_TIERS[STREAK_TIERS.length - 1];
}

/**
 * Displays a name with an award badge icon next to it.
 * If selectedAward is set, shows that award's icon.
 * Otherwise falls back to best streak tier badge.
 */
export const StreakTintedName = memo(function StreakTintedName({
  name,
  streakDays = 0,
  bestAchievedMilestone,
  achievementCount,
  selectedAward,
  className,
}: StreakTintedNameProps) {
  // If user has selected a specific award, show that
  const selectedAwardTier = selectedAward ? getAwardById(selectedAward) : undefined;

  if (selectedAwardTier) {
    return (
      <span className={cn('inline-flex items-center gap-1', className)}>
        {name}
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex cursor-default">
                <AwardIcon tier={selectedAwardTier} achieved={true} size={14} />
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {selectedAwardTier.category === 'streak' && `${selectedAwardTier.threshold}+ day streak`}
              {selectedAwardTier.category === 'notes' && `${selectedAwardTier.threshold} notes completed`}
              {selectedAwardTier.category === 'hours' && `${selectedAwardTier.threshold}h practiced`}
              {selectedAwardTier.category === 'legend' && `${selectedAwardTier.threshold} awards earned`}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </span>
    );
  }

  // Fallback: show best streak tier badge (legacy behavior)
  const currentTier = getStreakTier(streakDays);
  const displayTier = bestAchievedMilestone 
    ? getTierForMilestone(bestAchievedMilestone)
    : currentTier;
  
  const dbCount = achievementCount || 0;
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
