import { memo } from 'react';
import { getStreakTier } from '@/lib/streakUtils';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TrophyBadge } from '@/components/shared/TrophyBadge';

interface StreakTintedNameProps {
  name: string;
  streakDays?: number;
  achievementCount?: number;
  className?: string;
}

/**
 * Displays a name with a subtle streak badge icon next to it
 * All tiers use Trophy icon with different colors, with achievement count engraved
 */
export const StreakTintedName = memo(function StreakTintedName({
  name,
  streakDays = 0,
  achievementCount,
  className,
}: StreakTintedNameProps) {
  const tier = getStreakTier(streakDays);
  
  // Calculate display count - if at or above tier, show at least 1
  const dbCount = achievementCount || 0;
  const displayCount = streakDays >= tier.minDays ? Math.max(dbCount, 1) : dbCount;
  const showBadge = tier.tier !== 'none';
  
  const badge = !showBadge ? null : (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex cursor-default">
            <TrophyBadge tier={tier} count={displayCount} />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {tier.minDays}+ day streak{displayCount > 0 ? ` (${displayCount}x)` : ''}
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
