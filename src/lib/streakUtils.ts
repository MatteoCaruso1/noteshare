// Streak tier definitions
export type StreakTier = 'none' | 'starter' | 'bronze' | 'silver' | 'gold';

export interface StreakTierInfo {
  tier: StreakTier;
  label: string;
  minDays: number;
  colorClass: string;
  textColorClass: string;
  bgColorClass: string;
  borderColorClass: string;
  ringColorClass: string;
}

export const STREAK_TIERS: StreakTierInfo[] = [
  { tier: 'gold', label: 'Gold', minDays: 360, colorClass: 'text-yellow-500', textColorClass: 'text-yellow-600 dark:text-yellow-400', bgColorClass: 'bg-yellow-500/10', borderColorClass: 'border-yellow-500/30', ringColorClass: 'ring-yellow-500/20' },
  { tier: 'silver', label: 'Silver', minDays: 90, colorClass: 'text-slate-400', textColorClass: 'text-slate-500 dark:text-slate-300', bgColorClass: 'bg-slate-400/10', borderColorClass: 'border-slate-400/30', ringColorClass: 'ring-slate-400/20' },
  { tier: 'bronze', label: 'Bronze', minDays: 30, colorClass: 'text-amber-500', textColorClass: 'text-amber-600 dark:text-amber-400', bgColorClass: 'bg-amber-500/10', borderColorClass: 'border-amber-500/30', ringColorClass: 'ring-amber-500/20' },
  { tier: 'starter', label: '10d', minDays: 10, colorClass: 'text-primary', textColorClass: 'text-primary', bgColorClass: 'bg-primary/10', borderColorClass: 'border-primary/30', ringColorClass: 'ring-primary/20' },
  { tier: 'none', label: '', minDays: 0, colorClass: '', textColorClass: '', bgColorClass: '', borderColorClass: '', ringColorClass: '' },
];

export function getStreakTier(streakDays: number): StreakTierInfo {
  for (const tier of STREAK_TIERS) {
    if (streakDays >= tier.minDays) {
      return tier;
    }
  }
  return STREAK_TIERS[STREAK_TIERS.length - 1];
}

export function getNextStreakMilestone(streakDays: number): { days: number; tier: StreakTierInfo } | null {
  // Find the next tier above current streak
  for (let i = STREAK_TIERS.length - 2; i >= 0; i--) {
    if (streakDays < STREAK_TIERS[i].minDays) {
      return { days: STREAK_TIERS[i].minDays, tier: STREAK_TIERS[i] };
    }
  }
  return null; // Already at max tier
}

export function getStreakMilestoneMessage(streakDays: number): string | null {
  const nextMilestone = getNextStreakMilestone(streakDays);
  if (!nextMilestone) return null;
  
  const daysRemaining = nextMilestone.days - streakDays;
  return `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} until next reward`;
}
