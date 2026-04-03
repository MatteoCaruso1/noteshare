// Award system definitions
// All award categories, tiers, and display info

export type AwardCategory = 'streak' | 'notes' | 'hours' | 'consistency' | 'legend';

export interface AwardTier {
  id: string;          // e.g. "streak-30", "notes-100", "hours-50"
  category: AwardCategory;
  label: string;       // e.g. "30d", "100 notes", "50h"
  threshold: number;   // The numeric threshold (days, notes, or hours)
  colorClass: string;  // SVG stroke/fill color class
  fillColor: string;   // Actual HSL for SVG rendering
  bgColorClass: string;
  borderColorClass: string;
  ringColorClass: string;
}

export interface AwardCategoryInfo {
  category: AwardCategory;
  title: string;
  iconType: 'trophy' | 'notebook' | 'clock' | 'calendar' | 'crown';
  tiers: AwardTier[];
}

// Color palettes for tiers within each category
// Uses semantic token colors where possible, with explicit HSL for SVG

const TIER_COLORS = {
  starter: {
    colorClass: 'text-primary',
    fillColor: 'hsl(var(--primary))',
    bgColorClass: 'bg-primary/10',
    borderColorClass: 'border-primary/30',
    ringColorClass: 'ring-primary/20',
  },
  bronze: {
    colorClass: 'text-amber-500',
    fillColor: 'hsl(38, 92%, 50%)',
    bgColorClass: 'bg-amber-500/10',
    borderColorClass: 'border-amber-500/30',
    ringColorClass: 'ring-amber-500/20',
  },
  silver: {
    colorClass: 'text-slate-400',
    fillColor: 'hsl(215, 14%, 62%)',
    bgColorClass: 'bg-slate-400/10',
    borderColorClass: 'border-slate-400/30',
    ringColorClass: 'ring-slate-400/20',
  },
  gold: {
    colorClass: 'text-yellow-500',
    fillColor: 'hsl(48, 96%, 53%)',
    bgColorClass: 'bg-yellow-500/10',
    borderColorClass: 'border-yellow-500/30',
    ringColorClass: 'ring-yellow-500/20',
  },
  diamond: {
    colorClass: 'text-cyan-400',
    fillColor: 'hsl(187, 85%, 53%)',
    bgColorClass: 'bg-cyan-400/10',
    borderColorClass: 'border-cyan-400/30',
    ringColorClass: 'ring-cyan-400/20',
  },
  purple: {
    colorClass: 'text-purple-500',
    fillColor: 'hsl(270, 70%, 60%)',
    bgColorClass: 'bg-purple-500/10',
    borderColorClass: 'border-purple-500/30',
    ringColorClass: 'ring-purple-500/20',
  },
  platinum: {
    colorClass: 'text-zinc-300',
    fillColor: 'hsl(240, 5%, 84%)',
    bgColorClass: 'bg-zinc-300/10',
    borderColorClass: 'border-zinc-300/30',
    ringColorClass: 'ring-zinc-300/20',
  },
  crimson: {
    colorClass: 'text-red-500',
    fillColor: 'hsl(0, 84%, 60%)',
    bgColorClass: 'bg-red-500/10',
    borderColorClass: 'border-red-500/30',
    ringColorClass: 'ring-red-500/20',
  },
};

// Streak awards (reusing existing thresholds)
const STREAK_TIERS: AwardTier[] = [
  { id: 'streak-5', category: 'streak', label: '5d', threshold: 5, ...TIER_COLORS.starter },
  { id: 'streak-10', category: 'streak', label: '10d', threshold: 10, ...TIER_COLORS.bronze },
  { id: 'streak-30', category: 'streak', label: '30d', threshold: 30, ...TIER_COLORS.silver },
  { id: 'streak-50', category: 'streak', label: '50d', threshold: 50, ...TIER_COLORS.gold },
  { id: 'streak-100', category: 'streak', label: '100d', threshold: 100, ...TIER_COLORS.diamond },
];

// Notes completed awards
const NOTES_TIERS: AwardTier[] = [
  { id: 'notes-30', category: 'notes', label: '30', threshold: 30, ...TIER_COLORS.starter },
  { id: 'notes-100', category: 'notes', label: '100', threshold: 100, ...TIER_COLORS.bronze },
  { id: 'notes-200', category: 'notes', label: '200', threshold: 200, ...TIER_COLORS.silver },
  { id: 'notes-300', category: 'notes', label: '300', threshold: 300, ...TIER_COLORS.gold },
  { id: 'notes-500', category: 'notes', label: '500', threshold: 500, ...TIER_COLORS.diamond },
];

// Hours practiced awards (thresholds in hours)
const HOURS_TIERS: AwardTier[] = [
  { id: 'hours-10', category: 'hours', label: '10h', threshold: 10, ...TIER_COLORS.starter },
  { id: 'hours-50', category: 'hours', label: '50h', threshold: 50, ...TIER_COLORS.bronze },
  { id: 'hours-100', category: 'hours', label: '100h', threshold: 100, ...TIER_COLORS.silver },
  { id: 'hours-250', category: 'hours', label: '250h', threshold: 250, ...TIER_COLORS.gold },
  { id: 'hours-500', category: 'hours', label: '500h', threshold: 500, ...TIER_COLORS.diamond },
];

// Consistency awards
const CONSISTENCY_TIERS: AwardTier[] = [
  { id: 'consistency-25days', category: 'consistency', label: '25d', threshold: 25, ...TIER_COLORS.silver },
  { id: 'consistency-10goals', category: 'consistency', label: '10🎯', threshold: 10, ...TIER_COLORS.silver },
  { id: 'consistency-75pct', category: 'consistency', label: '75%', threshold: 75, ...TIER_COLORS.gold },
];

// Legend awards — based on total awards earned (excluding legend awards themselves)
const LEGEND_TIERS: AwardTier[] = [
  { id: 'legend-9', category: 'legend', label: '9', threshold: 9, ...TIER_COLORS.purple },
  { id: 'legend-14', category: 'legend', label: '14', threshold: 14, ...TIER_COLORS.platinum },
  { id: 'legend-17', category: 'legend', label: '17', threshold: 17, ...TIER_COLORS.crimson },
];

// Base tiers (non-legend) used for counting toward legend awards
const BASE_AWARD_TIERS: AwardTier[] = [...STREAK_TIERS, ...NOTES_TIERS, ...HOURS_TIERS, ...CONSISTENCY_TIERS];

export const AWARD_CATEGORIES: AwardCategoryInfo[] = [
  { category: 'streak', title: 'Streak', iconType: 'trophy', tiers: STREAK_TIERS },
  { category: 'notes', title: 'Notes Completed', iconType: 'notebook', tiers: NOTES_TIERS },
  { category: 'hours', title: 'Time Practiced', iconType: 'clock', tiers: HOURS_TIERS },
  { category: 'consistency', title: 'Consistency', iconType: 'calendar', tiers: CONSISTENCY_TIERS },
  { category: 'legend', title: 'Noteshare Legend', iconType: 'crown', tiers: LEGEND_TIERS },
];

export const ALL_AWARD_TIERS: AwardTier[] = [...BASE_AWARD_TIERS, ...LEGEND_TIERS];

export function getAwardById(id: string): AwardTier | undefined {
  return ALL_AWARD_TIERS.find(t => t.id === id);
}

/**
 * Given user stats, returns which award IDs are achieved
 */
export function getAchievedAwards(stats: {
  bestStreak: number;
  totalNotes: number;
  totalHours: number;
  bestMonthDays?: number;
  bestCompletedYearPct?: number;
  weeklyGoalsMetCount?: number;
}): Set<string> {
  const achieved = new Set<string>();

  // First compute base awards
  for (const tier of STREAK_TIERS) {
    if (stats.bestStreak >= tier.threshold) achieved.add(tier.id);
  }
  for (const tier of NOTES_TIERS) {
    if (stats.totalNotes >= tier.threshold) achieved.add(tier.id);
  }
  for (const tier of HOURS_TIERS) {
    if (stats.totalHours >= tier.threshold) achieved.add(tier.id);
  }

  // Consistency awards
  if ((stats.bestMonthDays ?? 0) >= 25) achieved.add('consistency-25days');
  if ((stats.bestCompletedYearPct ?? 0) >= 75) achieved.add('consistency-75pct');

  // Then compute legend awards based on base award count
  const baseCount = achieved.size;
  for (const tier of LEGEND_TIERS) {
    if (baseCount >= tier.threshold) achieved.add(tier.id);
  }

  return achieved;
}

/**
 * Get the count of base (non-legend) awards achieved
 */
export function getBaseAchievedCount(stats: {
  bestStreak: number;
  totalNotes: number;
  totalHours: number;
  bestMonthDays?: number;
  bestCompletedYearPct?: number;
}): number {
  let count = 0;
  for (const tier of STREAK_TIERS) {
    if (stats.bestStreak >= tier.threshold) count++;
  }
  for (const tier of NOTES_TIERS) {
    if (stats.totalNotes >= tier.threshold) count++;
  }
  for (const tier of HOURS_TIERS) {
    if (stats.totalHours >= tier.threshold) count++;
  }
  if ((stats.bestMonthDays ?? 0) >= 25) count++;
  if ((stats.bestCompletedYearPct ?? 0) >= 75) count++;
  return count;
}

/**
 * Get the best achieved award for display (highest tier in any category)
 * Returns the award tier to display, or undefined if none
 */
export function getBestAchievedAward(stats: {
  bestStreak: number;
  totalNotes: number;
  totalHours: number;
  bestMonthDays?: number;
  bestCompletedYearPct?: number;
}): AwardTier | undefined {
  const achieved = getAchievedAwards(stats);
  // Return the last (highest) achieved tier across all categories
  let best: AwardTier | undefined;
  for (const tier of ALL_AWARD_TIERS) {
    if (achieved.has(tier.id)) best = tier;
  }
  return best;
}
