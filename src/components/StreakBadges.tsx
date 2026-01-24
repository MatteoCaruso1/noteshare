import { STREAK_TIERS, StreakTierInfo } from '@/lib/streakUtils';
import { TrophyBadge } from '@/components/shared/TrophyBadge';
import { TapTooltip } from '@/components/shared/TapTooltip';

interface StreakBadgesProps {
  bestStreak: number;
  achievementCounts?: Record<string, number>;
}

function getBadgeDescription(tier: StreakTierInfo, count?: number): string {
  const timesText = count && count > 0 
    ? ` (achieved ${count} time${count !== 1 ? 's' : ''})`
    : '';
  return `Achieved ${tier.minDays}+ day streak${timesText}`;
}

export function StreakBadges({ bestStreak, achievementCounts }: StreakBadgesProps) {
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
        // The database count tracks how many times this milestone was claimed/celebrated
        const dbCount = achievementCounts?.[tier.minDays.toString()] || 0;
        
        // Always show at least 1 if they've achieved this tier based on best streak
        // The badge is only shown if bestStreak >= tier.minDays (line 20-21), 
        // so if we're here, they've achieved it at least once
        const count = Math.max(dbCount, 1);
        
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
