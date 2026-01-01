import { memo } from 'react';
import { getStreakTier } from '@/lib/streakUtils';
import { cn } from '@/lib/utils';
import { Award, Medal, Trophy, Star } from 'lucide-react';

interface StreakTintedNameProps {
  name: string;
  streakDays?: number;
  className?: string;
}

/**
 * Displays a name with a subtle streak badge icon next to it
 * - 360+ days: Gold trophy
 * - 90+ days: Silver medal
 * - 30+ days: Bronze award
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
    
    switch (tier.tier) {
      case 'gold':
        return <Trophy className={iconClass} />;
      case 'silver':
        return <Medal className={iconClass} />;
      case 'bronze':
        return <Award className={iconClass} />;
      case 'starter':
        return <Star className={iconClass} />;
      default:
        return null;
    }
  };

  const badge = renderBadge();
  
  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      {name}
      {badge}
    </span>
  );
});
