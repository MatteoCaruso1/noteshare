import { memo } from 'react';
import { getStreakTier } from '@/lib/streakUtils';
import { cn } from '@/lib/utils';
import { Flame, Medal, Trophy, Star } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface StreakTintedNameProps {
  name: string;
  streakDays?: number;
  className?: string;
}

/**
 * Displays a name with a subtle streak badge icon next to it
 * - 360+ days: Gold trophy
 * - 90+ days: Silver medal
 * - 30+ days: Bronze flame
 * - 10+ days: Starter star
 */
export const StreakTintedName = memo(function StreakTintedName({
  name,
  streakDays = 0,
  className,
}: StreakTintedNameProps) {
  const tier = getStreakTier(streakDays);
  
  const renderBadge = () => {
    if (tier.tier === 'none') return null;
    
    const iconClass = `w-3.5 h-3.5 ${tier.colorClass} opacity-80`;
    
    let icon;
    switch (tier.tier) {
      case 'gold':
        icon = <Trophy className={iconClass} />;
        break;
      case 'silver':
        icon = <Medal className={iconClass} />;
        break;
      case 'bronze':
        icon = <Flame className={iconClass} />;
        break;
      case 'starter':
        icon = <Star className={iconClass} />;
        break;
      default:
        return null;
    }

    return (
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex cursor-default">{icon}</span>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            {tier.label} Streak ({tier.minDays}+ days)
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const badge = renderBadge();
  
  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      {name}
      {badge}
    </span>
  );
});
