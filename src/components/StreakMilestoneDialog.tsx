import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Medal, Sparkles } from 'lucide-react';
import { StreakTierInfo } from '@/lib/streakUtils';

interface StreakMilestoneDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tier: StreakTierInfo;
  streakDays: number;
  hasNextMilestone: boolean;
}

function TierIcon({ tier }: { tier: StreakTierInfo }) {
  if (tier.tier === 'none') return null;
  return <Medal className={`w-12 h-12 ${tier.colorClass}`} />;
}

function getRewardDescription(tier: StreakTierInfo): string {
  switch (tier.tier) {
    case 'starter':
      return 'A starter medal badge appears next to your name — visible to everyone!';
    case 'bronze':
      return 'A bronze medal badge now appears next to your name!';
    case 'silver':
      return 'A silver medal badge now appears next to your name!';
    case 'gold':
      return 'A gold medal badge now appears next to your name!';
    default:
      return '';
  }
}

function getNextMilestoneText(tier: StreakTierInfo): string {
  switch (tier.tier) {
    case 'starter':
      return 'Keep going! Reach 30 days to upgrade to a bronze medal badge.';
    case 'bronze':
      return 'Keep it up! Reach 90 days to upgrade to a silver medal badge.';
    case 'silver':
      return 'Almost there! Reach 360 days to upgrade to a gold medal badge.';
    default:
      return '';
  }
}

export function StreakMilestoneDialog({
  open,
  onOpenChange,
  tier,
  streakDays,
  hasNextMilestone,
}: StreakMilestoneDialogProps) {
  const rewardDescription = getRewardDescription(tier);
  const nextMilestoneText = getNextMilestoneText(tier);

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
              Congratulations! You've practiced for{' '}
              <span className={`font-semibold ${tier.textColorClass}`}>
                {streakDays} days
              </span>{' '}
              in a row!
            </p>
            <p className="text-sm">
              <span className="font-medium">Your rewards:</span> {rewardDescription}
            </p>
            {hasNextMilestone && nextMilestoneText && (
              <p className="text-sm text-muted-foreground italic">
                {nextMilestoneText}
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
