import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Plus, Minus, Check, Clock, ListChecks } from 'lucide-react';
import { Goal } from '@/types';
import { cn } from '@/lib/utils';

interface GoalProgressBarProps {
  goal: Goal;
  onIncrement?: () => void;
  onDecrement?: () => void;
  onComplete?: () => void;
  showControls?: boolean;
}

export function GoalProgressBar({ 
  goal, 
  onIncrement, 
  onDecrement, 
  onComplete,
  showControls = true 
}: GoalProgressBarProps) {
  const getProgress = () => {
    if (goal.is_completed) return 100;
    
    switch (goal.progress_type) {
      case 'checkbox':
        return goal.is_completed ? 100 : 0;
      case 'step':
        return goal.target_steps > 0 
          ? Math.min(100, (goal.current_steps / goal.target_steps) * 100)
          : 0;
      case 'time':
        return goal.target_minutes > 0 
          ? Math.min(100, (goal.current_minutes / goal.target_minutes) * 100)
          : 0;
      default:
        return 0;
    }
  };

  const progress = getProgress();
  const isComplete = progress >= 100;

  const getProgressText = () => {
    switch (goal.progress_type) {
      case 'checkbox':
        return isComplete ? 'Complete!' : 'Not started';
      case 'step':
        return `${goal.current_steps}/${goal.target_steps} steps`;
      case 'time':
        return `${goal.current_minutes}/${goal.target_minutes} min`;
      default:
        return '';
    }
  };

  const getIcon = () => {
    switch (goal.progress_type) {
      case 'checkbox':
        return <Check className="w-3 h-3" />;
      case 'step':
        return <ListChecks className="w-3 h-3" />;
      case 'time':
        return <Clock className="w-3 h-3" />;
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1 text-muted-foreground">
          {getIcon()}
          <span>{getProgressText()}</span>
        </div>
        {showControls && !goal.is_completed && (
          <div className="flex items-center gap-1">
            {goal.progress_type === 'checkbox' && onComplete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={onComplete}
              >
                <Check className="w-3 h-3" />
              </Button>
            )}
            {(goal.progress_type === 'step' || goal.progress_type === 'time') && (
              <>
                {onDecrement && goal.current_steps > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={onDecrement}
                  >
                    <Minus className="w-3 h-3" />
                  </Button>
                )}
                {onIncrement && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={onIncrement}
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                )}
              </>
            )}
          </div>
        )}
      </div>
      <Progress 
        value={progress} 
        className={cn(
          "h-2",
          isComplete && "bg-primary/20"
        )}
      />
    </div>
  );
}
