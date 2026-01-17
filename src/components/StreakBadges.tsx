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
  
  // If count is provided and > 0, show it; otherwise show nothing
  const displayCount = count && count > 0 ? (count > 99 ? '99+' : count) : null;
  
  return (
    <div className="relative inline-flex items-center justify-center">
      <Trophy className={`w-4 h-4 ${tier.colorClass}`} />
      {displayCount && (
        <span 
          className={`absolute inset-0 flex items-center justify-center text-[7px] font-bold ${tier.colorClass}`}
          style={{ textShadow: '0 0 2px hsl(var(--background))', marginTop: '-1px' }}
        >
          {displayCount}
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
          // Count includes current achievement if we're at/above this milestone
          // The DB count tracks completed milestones, but if we're currently AT the streak, it counts as 1
          const dbCount = achievementCounts?.[tier.minDays.toString()] || 0;
          // If the user is at or above this tier's threshold, they've achieved it at least once
          const count = currentStreak >= tier.minDays ? Math.max(dbCount, 1) : dbCount;
          
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
