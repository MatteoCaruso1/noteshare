import { Card } from '@/components/ui/card';
import { Trophy } from 'lucide-react';
import { STREAK_TIERS, getStreakMilestoneMessage } from '@/lib/streakUtils';

interface StreakRewardsSectionProps {
  currentStreak: number;
}

export function StreakRewardsSection({ currentStreak }: StreakRewardsSectionProps) {
  return (
    <Card className="p-4 bg-card border-border">
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="w-5 h-5 text-primary" />
        <h3 className="font-medium">Streak Rewards</h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {[...STREAK_TIERS].filter(t => t.tier !== 'none').reverse().map((tier) => {
          const achieved = currentStreak >= tier.minDays;
          return (
            <div 
              key={tier.tier}
              className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                achieved 
                  ? `${tier.bgColorClass} ${tier.colorClass} font-medium` 
                  : tier.tier === 'starter'
                    ? 'bg-primary/20 text-primary/60'
                    : tier.tier === 'bronze' 
                      ? 'bg-amber-600/20 text-amber-700/60 dark:text-amber-500/60'
                      : tier.tier === 'silver'
                        ? 'bg-slate-400/20 text-slate-500/60 dark:text-slate-300/60'
                        : 'bg-yellow-500/20 text-yellow-600/60 dark:text-yellow-400/60'
              }`}
            >
              <span>{tier.minDays}d</span>
              {achieved && <span>✓</span>}
            </div>
          );
        })}
      </div>
      {getStreakMilestoneMessage(currentStreak) && (
        <p className="text-xs text-muted-foreground italic mt-2">
          {getStreakMilestoneMessage(currentStreak)}
        </p>
      )}
    </Card>
  );
}
