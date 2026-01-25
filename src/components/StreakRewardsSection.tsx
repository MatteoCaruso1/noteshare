import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Trophy } from 'lucide-react';
import { STREAK_TIERS, getStreakMilestoneMessage } from '@/lib/streakUtils';

interface StreakRewardsSectionProps {
  currentStreak: number;
}

// Get tooltip description for each tier
const getTierTooltip = (tier: string, minDays: number, achieved: boolean): string => {
  const tierNames: Record<string, string> = {
    starter: '10-Day Streak Reward',
    bronze: 'Bronze (30-Day) Reward',
    silver: 'Silver (90-Day) Reward',
    gold: 'Gold (360-Day) Reward',
  };
  const name = tierNames[tier] || `${minDays}-Day Reward`;
  return achieved ? `${name} - Achieved!` : `${name} - Keep practicing!`;
};

export function StreakRewardsSection({ currentStreak }: StreakRewardsSectionProps) {
  return (
    <Card className="p-4 bg-card border-border">
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="w-5 h-5 text-primary" />
        <h3 className="font-medium">Streak Rewards</h3>
      </div>
      <TooltipProvider delayDuration={300}>
        <div className="flex flex-wrap gap-2">
          {[...STREAK_TIERS].filter(t => t.tier !== 'none').reverse().map((tier) => {
            const achieved = currentStreak >= tier.minDays;
            return (
              <Tooltip key={tier.tier}>
                <TooltipTrigger asChild>
                  <div 
                    className={`inline-flex items-center justify-center gap-1 px-2 py-1 rounded-full text-xs leading-none cursor-default ${
                      achieved 
                        ? `${tier.bgColorClass} ${tier.colorClass} font-medium` 
                        : tier.tier === 'starter'
                          ? 'bg-primary/20 text-primary/60'
                          : tier.tier === 'bronze' 
                            ? 'bg-amber-500/20 text-amber-500/60'
                            : tier.tier === 'silver'
                              ? 'bg-slate-400/20 text-slate-500/60 dark:text-slate-300/60'
                              : 'bg-yellow-500/20 text-yellow-600/60 dark:text-yellow-400/60'
                    }`}
                  >
                    <span className="pt-px">{tier.minDays}d</span>
                    {achieved && <span className="pt-px">✓</span>}
                  </div>
                </TooltipTrigger>
                <TooltipContent>{getTierTooltip(tier.tier, tier.minDays, achieved)}</TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>
      {getStreakMilestoneMessage(currentStreak) && (
        <p className="text-xs text-muted-foreground italic mt-2">
          {getStreakMilestoneMessage(currentStreak)}
        </p>
      )}
    </Card>
  );
}
