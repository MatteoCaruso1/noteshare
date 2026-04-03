import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Trophy, Sparkles } from 'lucide-react';
import { StreakTierInfo } from '@/lib/streakUtils';
import { AWARD_CATEGORIES } from '@/lib/awardUtils';

interface StreakMilestoneDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tier: StreakTierInfo;
  streakDays: number;
  hasNextMilestone: boolean;
  achievementCount?: number;
  milestoneDays?: number; // The actual milestone threshold (e.g. 5, 10, 30)
}

function TierIcon({ tier }: { tier: StreakTierInfo }) {
  if (tier.tier === 'none') return null;
  return <Trophy className={`w-12 h-12 ${tier.colorClass}`} />;
}

function getRewardDescription(tier: StreakTierInfo, isRepeat: boolean): string {
  if (isRepeat) {
    switch (tier.tier) {
      case 'starter':
        return 'Your starter trophy counter has been increased!';
      case 'bronze':
        return 'Your bronze trophy counter has been increased!';
      case 'silver':
        return 'Your silver trophy counter has been increased!';
      case 'gold':
        return 'Your gold trophy counter has been increased!';
      default:
        return '';
    }
  } else {
    switch (tier.tier) {
      case 'starter':
        return 'A starter trophy now appears beside your name.';
      case 'bronze':
        return 'A bronze trophy now appears beside your name.';
      case 'silver':
        return 'A silver trophy now appears beside your name.';
      case 'gold':
        return 'A gold trophy now appears beside your name.';
      default:
        return '';
    }
  }
}

function getNextAwardMilestoneDays(currentMilestone: number): number | null {
  const streakCategory = AWARD_CATEGORIES.find(c => c.category === 'streak');
  if (!streakCategory) return null;
  const thresholds = streakCategory.tiers.map(t => t.threshold).sort((a, b) => a - b);
  const idx = thresholds.indexOf(currentMilestone);
  if (idx >= 0 && idx < thresholds.length - 1) {
    return thresholds[idx + 1];
  }
  return null;
}

export function StreakMilestoneDialog({
  open,
  onOpenChange,
  tier,
  streakDays,
  hasNextMilestone,
  achievementCount = 1,
  milestoneDays,
}: StreakMilestoneDialogProps) {
  const isRepeatAchievement = achievementCount > 1;
  const rewardDescription = getRewardDescription(tier, isRepeatAchievement);
  const nextMilestoneDays = milestoneDays != null
    ? getNextAwardMilestoneDays(milestoneDays)
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center items-center">
          <div className={`p-4 rounded-full ${tier.bgColorClass} mb-2`}>
            <TierIcon tier={tier} />
          </div>
          <div className="flex items-center justify-center gap-2">
            <Sparkles className={`w-5 h-5 ${tier.colorClass}`} />
            <DialogTitle className={`text-xl ${tier.textColorClass}`}>
              {tier.label} Streak Achieved!
            </DialogTitle>
            <Sparkles className={`w-5 h-5 ${tier.colorClass}`} />
          </div>
          <DialogDescription className="text-center space-y-3 pt-2">
            <p className="text-base">
              Congratulations! You've practiced{' '}
              <span className={`font-semibold ${tier.textColorClass}`}>
                {streakDays} days
              </span>{' '}
              in a row{isRepeatAchievement ? ' again' : ''}!
            </p>
            <p className="text-sm">
              {rewardDescription}
            </p>
            {hasNextMilestone && nextMilestoneDays && (
              <p className="text-sm text-muted-foreground italic">
                Reach {nextMilestoneDays} days to obtain your next reward!
              </p>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center pt-4">
          <Button onClick={() => onOpenChange(false)} className="px-8">
            Awesome!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
