import { memo } from 'react';
import { getStreakTier } from '@/lib/streakUtils';
import { cn } from '@/lib/utils';
import { Trophy } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
  const showCount = displayCount > 0;
  const countText = displayCount > 99 ? '99+' : displayCount;
  
  const badge = tier.tier === 'none' ? null : (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex cursor-default relative">
            <Trophy className={`w-3.5 h-3.5 ${tier.colorClass} opacity-80`} />
            {showCount && (
              <span 
                className={`absolute inset-0 flex items-center justify-center text-[6px] font-bold ${tier.colorClass}`}
                style={{ textShadow: '0 0 2px hsl(var(--background))', marginTop: '-2px' }}
              >
                {countText}
              </span>
            )}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {tier.minDays}+ day streak{showCount ? ` (${displayCount}x)` : ''}
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
