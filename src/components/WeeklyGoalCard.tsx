import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useWeeklyGoal, useCurrentWeekPracticeMinutes } from '@/hooks/useWeeklyGoal';
import { useAuth } from '@/hooks/useAuth';
import { usePremium } from '@/contexts/PremiumContext';
import { Target, Clock, Trophy } from 'lucide-react';

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
    <Card className={`p-3 border transition-colors ${
      isComplete 
        ? 'border-green-500/30 bg-green-500/5' 
        : 'border-primary/20 bg-primary/5'
    }`}>
      <div className="space-y-2">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isComplete ? (
              <Trophy className="w-4 h-4 text-green-500" />
            ) : (
              <Target className="w-4 h-4 text-primary" />
            )}
            <span className="text-sm font-medium">Weekly Practice Goal</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>This week</span>
          </div>
        </div>
        
        {/* Progress */}
        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between">
            <span className={`text-lg font-bold ${isComplete ? 'text-green-500' : ''}`}>
              {formatMinutes(currentMinutes)}
            </span>
            <span className="text-sm text-muted-foreground">
              / {formatMinutes(targetMinutes)}
            </span>
          </div>
          <Progress 
            value={progressPercent} 
            className={`h-2 ${isComplete ? '[&>div]:bg-green-500' : ''}`}
          />
          {isComplete && (
            <p className="text-xs text-green-600 dark:text-green-400 font-medium">
              🎉 Goal achieved! Keep up the momentum!
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
