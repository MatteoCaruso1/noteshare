import { Progress } from '@/components/ui/progress';
import { useWeeklyGoal, useCurrentWeekPracticeMinutes } from '@/hooks/useWeeklyGoal';
import { useAuth } from '@/hooks/useAuth';
import { usePremium } from '@/contexts/PremiumContext';
import { Target, Trophy } from 'lucide-react';

export function WeeklyGoalCard() {
  const { profile } = useAuth();
  const { isPremium } = usePremium();
  const { currentWeekGoal, isLoading } = useWeeklyGoal(profile?.id);
  const currentMinutes = useCurrentWeekPracticeMinutes(profile?.id);
  
  // Don't render if not premium, loading, no goal, or goal was skipped
  if (!isPremium || isLoading || !currentWeekGoal || currentWeekGoal.skipped) {
    return null;
  }
  
  const targetMinutes = currentWeekGoal.target_minutes;
  const progressPercent = Math.min(100, (currentMinutes / targetMinutes) * 100);
  const isComplete = currentMinutes >= targetMinutes;
  
  const formatMinutes = (mins: number) => {
    if (mins >= 60) {
      const hours = Math.floor(mins / 60);
      const remainingMins = mins % 60;
      return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
    }
    return `${mins}m`;
  };
  
  return (
    <div className={`p-3 rounded-lg border transition-colors ${
      isComplete 
        ? 'border-green-500/30 bg-green-500/5' 
        : 'border-border bg-muted/30'
    }`}>
      <div className="space-y-2">
        {/* Header row with badge and progress */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {isComplete ? (
              <Trophy className="w-4 h-4 text-green-500 shrink-0" />
            ) : (
              <Target className="w-4 h-4 text-primary shrink-0" />
            )}
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Weekly Goal</span>
          </div>
          
          {/* Progress display */}
          <div className="flex items-center gap-1.5">
            <span className={`text-sm font-bold ${isComplete ? 'text-green-500' : ''}`}>
              {formatMinutes(currentMinutes)}
            </span>
            <span className="text-xs text-muted-foreground">
              / {formatMinutes(targetMinutes)}
            </span>
          </div>
        </div>
        
        {/* Progress bar */}
        <Progress 
          value={progressPercent} 
          className={`h-1.5 ${isComplete ? '[&>div]:bg-green-500' : ''}`}
        />
        
        {isComplete && (
          <p className="text-xs text-green-600 dark:text-green-400 font-medium">
            🎉 Goal achieved!
          </p>
        )}
      </div>
    </div>
  );
}
