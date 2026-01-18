import { STREAK_TIERS, StreakTierInfo } from '@/lib/streakUtils';
import { TrophyBadge } from '@/components/shared/TrophyBadge';
import { TapTooltip } from '@/components/shared/TapTooltip';

interface StreakBadgesProps {
  currentStreak: number;
  bestStreak: number;
  achievementCounts?: Record<string, number>;
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
    <div className="flex items-center gap-2">
      {achievedTiers.map((tier) => {
        // Count includes current achievement if we're at/above this milestone
        // The DB count tracks completed milestones, but if we're currently AT the streak, it counts as 1
        const dbCount = achievementCounts?.[tier.minDays.toString()] || 0;
        // If the user is at or above this tier's threshold, they've achieved it at least once
        const count = currentStreak >= tier.minDays ? Math.max(dbCount, 1) : dbCount;
        
        return (
          <TapTooltip 
            key={tier.tier} 
            content={<p>{getBadgeDescription(tier, count)}</p>}
            className={`w-8 h-8 ${tier.bgColorClass} ${tier.borderColorClass} ${tier.ringColorClass} border ring-1 hover:opacity-80 transition-opacity`}
          >
            <TrophyBadge tier={tier} count={count} size={20} />
          </TapTooltip>
        );
      })}
    </div>
  );
}
