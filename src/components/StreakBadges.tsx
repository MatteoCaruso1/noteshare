import { Trophy } from 'lucide-react';
import { STREAK_TIERS, StreakTierInfo } from '@/lib/streakUtils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface StreakBadgesProps {
  currentStreak: number;
  bestStreak: number;
  achievementCounts?: Record<string, number>;
}

function BadgeIcon({ tier, count }: { tier: StreakTierInfo; count?: number }) {
  if (tier.tier === 'none') return null;
  return (
    <div className="relative">
      <Trophy className={`w-4 h-4 ${tier.colorClass}`} />
      {count && count > 0 && (
        <span className="absolute -bottom-1 -right-1.5 min-w-[12px] h-[12px] flex items-center justify-center text-[8px] font-bold bg-background border border-current rounded-full px-0.5">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </div>
  );
}

function getBadgeDescription(tier: StreakTierInfo, count?: number): string {
  const timesText = count && count > 0 
    ? ` (achieved ${count} time${count !== 1 ? 's' : ''})`
    : '';
  return `Achieved ${tier.minDays}+ day streak${timesText}`;
}

export function StreakBadges({ currentStreak, bestStreak, achievementCounts }: StreakBadgesProps) {
  // Get achieved tiers based on best streak (permanent badges)
  const achievedTiers = STREAK_TIERS.filter(
    tier => tier.tier !== 'none' && bestStreak >= tier.minDays
  );

  if (achievedTiers.length === 0) {
    return null;
  }

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex items-center gap-1.5">
        {achievedTiers.map((tier) => {
          const count = achievementCounts?.[tier.minDays.toString()] || 0;
          return (
            <Tooltip key={tier.tier}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${tier.bgColorClass} ${tier.colorClass} font-medium cursor-pointer hover:opacity-80 transition-opacity`}
                >
                  <BadgeIcon tier={tier} count={count} />
                  <span>{tier.label}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{getBadgeDescription(tier, count)}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
