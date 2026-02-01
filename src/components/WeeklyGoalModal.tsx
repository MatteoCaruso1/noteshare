import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useWeeklyGoal, useLastWeekPracticeMinutes } from '@/hooks/useWeeklyGoal';
import { useAuth } from '@/hooks/useAuth';
import { Target, TrendingUp, TrendingDown, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface WeeklyGoalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

export function WeeklyGoalModal({ open, onOpenChange, onComplete }: WeeklyGoalModalProps) {
  const { profile } = useAuth();
  const { lastWeekGoal, setGoal, isPending } = useWeeklyGoal(profile?.id);
  const lastWeekActualMinutes = useLastWeekPracticeMinutes(profile?.id);
  
  const [targetMinutes, setTargetMinutes] = useState<string>('');
  
  const handleSetGoal = () => {
    const minutes = parseInt(targetMinutes, 10);
    if (isNaN(minutes) || minutes <= 0) {
      toast.error('Please enter a valid number of minutes');
      return;
    }
    
    setGoal(
      { targetMinutes: minutes },
      {
        onSuccess: () => {
          toast.success('Weekly goal set!');
          onComplete();
          onOpenChange(false);
        },
        onError: () => {
          toast.error('Failed to set goal');
        },
      }
    );
  };
  
  const handleNoGoal = () => {
    setGoal(
      { targetMinutes: 0, skipped: true },
      {
        onSuccess: () => {
          onComplete();
          onOpenChange(false);
        },
      }
    );
  };
  
  const hasLastWeekData = lastWeekGoal || lastWeekActualMinutes > 0;
  const metLastWeekGoal = lastWeekGoal && !lastWeekGoal.skipped && lastWeekActualMinutes >= lastWeekGoal.target_minutes;
  
  const formatMinutes = (mins: number) => {
    if (mins >= 60) {
      const hours = Math.floor(mins / 60);
      const remainingMins = mins % 60;
      return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
    }
    return `${mins}m`;
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            <DialogTitle>Weekly Practice Goal</DialogTitle>
          </div>
          <DialogDescription>
            Set your practice target for this week
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 pt-2">
          {/* Last Week Recap */}
          {hasLastWeekData && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Clock className="w-4 h-4" />
                Last Week Recap
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                {lastWeekGoal && !lastWeekGoal.skipped && (
                  <div className="text-center">
                    <div className="text-2xl font-bold">{formatMinutes(lastWeekGoal.target_minutes)}</div>
                    <div className="text-xs text-muted-foreground">Goal</div>
                  </div>
                )}
                <div className={`text-center ${!lastWeekGoal || lastWeekGoal.skipped ? 'col-span-2' : ''}`}>
                  <div className="text-2xl font-bold">{formatMinutes(lastWeekActualMinutes)}</div>
                  <div className="text-xs text-muted-foreground">Practiced</div>
                </div>
              </div>
              
              {lastWeekGoal && !lastWeekGoal.skipped && (
                <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-md ${
                  metLastWeekGoal 
                    ? 'bg-green-500/10 text-green-600 dark:text-green-400' 
                    : 'bg-orange-500/10 text-orange-600 dark:text-orange-400'
                }`}>
                  {metLastWeekGoal ? (
                    <>
                      <TrendingUp className="w-4 h-4" />
                      <span>Amazing work, keep up the momentum!</span>
                    </>
                  ) : (
                    <>
                      <TrendingDown className="w-4 h-4" />
                      <span>Almost there, keep trying this week</span>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* Goal Input */}
          <div className="space-y-3">
            <Label htmlFor="target-minutes">
              Set your target practice time for this week
            </Label>
            <div className="flex gap-2">
              <Input
                id="target-minutes"
                type="number"
                placeholder="e.g., 120"
                value={targetMinutes}
                onChange={(e) => setTargetMinutes(e.target.value)}
                min={1}
                className="flex-1"
              />
              <span className="flex items-center text-sm text-muted-foreground px-2">
                minutes
              </span>
            </div>
            {targetMinutes && parseInt(targetMinutes) > 0 && (
              <p className="text-xs text-muted-foreground">
                That's about {formatMinutes(parseInt(targetMinutes))} of practice this week
              </p>
            )}
          </div>
          
          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleNoGoal}
              disabled={isPending}
              className="flex-1"
            >
              No Goal
            </Button>
            <Button
              onClick={handleSetGoal}
              disabled={isPending || !targetMinutes}
              className="flex-1"
            >
              Set Goal
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
