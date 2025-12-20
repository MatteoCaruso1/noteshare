import { memo } from 'react';
import { getStreakTier, StreakTier } from '@/lib/streakUtils';
import { cn } from '@/lib/utils';

interface StreakTintedNameProps {
  name: string;
  streakDays?: number;
  className?: string;
}

/**
 * Displays a name with optional streak-based color tint
 * - 360+ days: Gold tint
 * - 90+ days: Silver tint
 * - 30+ days: Bronze tint
 */
export const StreakTintedName = memo(function StreakTintedName({
  name,
  streakDays = 0,
  className,
}: StreakTintedNameProps) {
  const tier = getStreakTier(streakDays);
  
  return (
    <span className={cn(
      tier.tier !== 'none' ? tier.textColorClass : '',
      className
    )}>
      {name}
    </span>
  );
});
