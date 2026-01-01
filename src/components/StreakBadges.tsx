import { Medal } from 'lucide-react';
import { STREAK_TIERS, StreakTierInfo } from '@/lib/streakUtils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface StreakBadgesProps {
  currentStreak: number;
  bestStreak: number;
}

function BadgeIcon({ tier }: { tier: StreakTierInfo }) {
  if (tier.tier === 'none') return null;
  return <Medal className={`w-4 h-4 ${tier.colorClass}`} />;
}

function getBadgeDescription(tier: StreakTierInfo): string {
  return `Achieved ${tier.minDays}+ day streak`;
}

export function StreakBadges({ currentStreak, bestStreak }: StreakBadgesProps) {
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
        {achievedTiers.map((tier) => (
          <Tooltip key={tier.tier}>
            <TooltipTrigger asChild>
              <button
                type="button"
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${tier.bgColorClass} ${tier.colorClass} font-medium cursor-pointer hover:opacity-80 transition-opacity`}
              >
                <BadgeIcon tier={tier} />
                <span>{tier.label}</span>
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{getBadgeDescription(tier)}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}
