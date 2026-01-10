import { memo } from 'react';
import { getStreakTier } from '@/lib/streakUtils';
import { cn } from '@/lib/utils';
import { Trophy } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface StreakTintedNameProps {
  name: string;
  streakDays?: number;
  className?: string;
}

/**
 * Displays a name with a subtle streak badge icon next to it
 * All tiers use Trophy icon with different colors
 */
export const StreakTintedName = memo(function StreakTintedName({
  name,
  streakDays = 0,
  className,
}: StreakTintedNameProps) {
  const tier = getStreakTier(streakDays);
  
  const badge = tier.tier === 'none' ? null : (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex cursor-default">
            <Trophy className={`w-3.5 h-3.5 ${tier.colorClass} opacity-80`} />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {tier.label} Streak ({tier.minDays}+ days)
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
