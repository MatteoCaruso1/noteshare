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

interface StreakMilestoneDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tier: StreakTierInfo;
  streakDays: number;
  hasNextMilestone: boolean;
}

function TierIcon({ tier }: { tier: StreakTierInfo }) {
  if (tier.tier === 'none') return null;
  return <Trophy className={`w-12 h-12 ${tier.colorClass}`} />;
}

function getRewardDescription(tier: StreakTierInfo): string {
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

function getNextMilestoneDays(tier: StreakTierInfo): number | null {
  switch (tier.tier) {
    case 'starter':
      return 30;
    case 'bronze':
      return 90;
    case 'silver':
      return 360;
    default:
      return null;
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
  const nextMilestoneDays = getNextMilestoneDays(tier);

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
              in a row!
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
