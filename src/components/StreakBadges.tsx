import { Medal } from 'lucide-react';
import { STREAK_TIERS, StreakTierInfo } from '@/lib/streakUtils';

interface StreakBadgesProps {
  currentStreak: number;
  bestStreak: number;
}

function BadgeIcon({ tier }: { tier: StreakTierInfo }) {
  if (tier.tier === 'none') return null;
  return <Medal className={`w-4 h-4 ${tier.colorClass}`} />;
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
    <div className="flex items-center gap-1.5">
      {achievedTiers.map((tier) => (
        <div
          key={tier.tier}
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${tier.bgColorClass} ${tier.colorClass} font-medium`}
          title={`${tier.label} Streak Badge (${tier.minDays}+ days)`}
        >
          <BadgeIcon tier={tier} />
          <span>{tier.label}</span>
        </div>
      ))}
    </div>
  );
}
