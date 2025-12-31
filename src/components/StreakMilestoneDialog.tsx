import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Award, Medal, Trophy, Sparkles, Star } from 'lucide-react';
import { StreakTierInfo } from '@/lib/streakUtils';

interface StreakMilestoneDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tier: StreakTierInfo;
  streakDays: number;
  hasNextMilestone: boolean;
}

function TierIcon({ tier }: { tier: StreakTierInfo }) {
  const iconClass = `w-12 h-12 ${tier.colorClass}`;
  
  if (tier.tier === 'gold') {
    return <Trophy className={iconClass} />;
  } else if (tier.tier === 'silver') {
    return <Medal className={iconClass} />;
  } else if (tier.tier === 'bronze') {
    return <Award className={iconClass} />;
  } else if (tier.tier === 'starter') {
    return <Star className={iconClass} />;
  }
  return null;
}

function getRewardDescription(tier: StreakTierInfo): string {
  switch (tier.tier) {
    case 'starter':
      return 'A starter streak badge on your profile — visible to all users!';
    case 'bronze':
      return 'Bronze name highlight on your profile and a bronze streak badge!';
    case 'silver':
      return 'Silver name highlight on your profile and a silver streak badge!';
    case 'gold':
      return 'Gold name highlight on your profile and a prestigious gold streak badge!';
    default:
      return '';
  }
}

function getNextMilestoneText(tier: StreakTierInfo): string {
  switch (tier.tier) {
    case 'starter':
      return 'Keep going! Reach 30 days for bronze rewards and a name highlight.';
    case 'bronze':
      return 'Keep it up! Reach 90 days for silver rewards.';
    case 'silver':
      return 'Almost there! Reach 360 days for gold rewards.';
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
