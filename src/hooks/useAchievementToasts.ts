import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { getAchievedAwards, ALL_AWARD_TIERS, AWARD_CATEGORIES, AwardTier } from '@/lib/awardUtils';

const STORAGE_KEY = 'noteshare_seen_achievements';

function getSeenAchievements(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function markSeen(ids: string[]) {
  const seen = getSeenAchievements();
  ids.forEach(id => seen.add(id));
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...seen]));
}

function getAwardLabel(tier: AwardTier): string {
  const cat = AWARD_CATEGORIES.find(c => c.category === tier.category);
  const catName = cat?.title || tier.category;
  switch (tier.category) {
    case 'streak': return `${tier.threshold}-day streak`;
    case 'notes': return `${tier.threshold} notes`;
    case 'hours': return `${tier.threshold}h practiced`;
    case 'consistency':
      return tier.threshold === 25 ? '25 days in a month' : '75% yearly consistency';
    case 'legend': return `${catName} (${tier.threshold} awards)`;
    default: return catName;
  }
}

/**
 * Shows a toast when the user earns a new achievement.
 * Tracks seen achievements in localStorage so each fires only once.
 */
export function useAchievementToasts(stats: {
  bestStreak: number;
  totalNotes: number;
  totalHours: number;
  bestMonthDays: number;
  bestCompletedYearPct: number;
  weeklyGoalsMetCount?: number;
} | undefined) {
  const firedRef = useRef(false);

  useEffect(() => {
    if (!stats || firedRef.current) return;
    firedRef.current = true;

    const achieved = getAchievedAwards(stats);
    const seen = getSeenAchievements();
    const newAchievements = [...achieved].filter(id => !seen.has(id));

    if (newAchievements.length === 0) {
      // First load — seed seen set with current achievements so old ones don't re-fire
      if (seen.size === 0 && achieved.size > 0) {
        markSeen([...achieved]);
      }
      return;
    }

    // Show toast for each new achievement (slight stagger)
    newAchievements.forEach((id, i) => {
      const tier = ALL_AWARD_TIERS.find(t => t.id === id);
      if (!tier) return;

      setTimeout(() => {
        toast('🏆 Achievement unlocked!', {
          description: `${getAwardLabel(tier)} — ${achieved.size}/${ALL_AWARD_TIERS.length} earned. View in Profile.`,
          duration: 5000,
        });
      }, i * 1500);
    });

    markSeen(newAchievements);
  }, [stats]);
}
