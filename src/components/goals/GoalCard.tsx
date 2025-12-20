import { memo, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Goal } from '@/types';
import { GoalProgressBar } from './GoalProgressBar';
import { ChevronUp, ChevronDown, Calendar, Trophy, Sparkles, RotateCcw, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface GoalCardProps {
  goal: Goal;
  onEdit: () => void;
  onDelete: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onIncrementProgress: () => void;
  onDecrementProgress: () => void;
  onSetProgress?: (value: number) => void;
  onComplete: () => void;
  onRestore?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
  showReorder?: boolean;
}

export const GoalCard = memo(function GoalCard({
  goal,
  onEdit,
  onDelete,
  onMoveUp,
  onMoveDown,
  onIncrementProgress,
  onDecrementProgress,
  onSetProgress,
  onComplete,
  onRestore,
  isFirst,
  isLast,
  showReorder = true,
}: GoalCardProps) {
  const [showConfetti, setShowConfetti] = useState(false);

  const handleComplete = useCallback(() => {
    onComplete();
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 2000);
  }, [onComplete]);

  const handleIncrement = useCallback(() => {
    onIncrementProgress();
    // Check if this increment will complete the goal
    if (goal.progress_type === 'step' && goal.current_steps + 1 >= goal.target_steps) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2000);
    }
    if (goal.progress_type === 'time' && goal.current_minutes + 1 >= goal.target_minutes) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2000);
    }
  }, [onIncrementProgress, goal.progress_type, goal.current_steps, goal.target_steps, goal.current_minutes, goal.target_minutes]);

  return (
    <div 
      className={cn(
        "group relative rounded-xl border bg-card/50 backdrop-blur-sm transition-all duration-200 cursor-pointer",
        "hover:bg-card hover:shadow-md hover:border-primary/20",
        goal.is_completed && "bg-primary/5 border-primary/20 hover:bg-primary/10",
        showConfetti && "ring-2 ring-primary ring-offset-2 ring-offset-background"
      )}
      onClick={onEdit}
    >
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
          <div className="flex gap-1 animate-bounce">
            <Sparkles className="w-5 h-5 text-primary animate-pulse" />
            <Trophy className="w-6 h-6 text-primary" />
            <Sparkles className="w-5 h-5 text-primary animate-pulse" />
          </div>
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Reorder buttons */}
          {showReorder && !goal.is_completed && (
            <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 hover:bg-primary/10"
                onClick={onMoveUp}
                disabled={isFirst}
              >
                <ChevronUp className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 hover:bg-primary/10"
                onClick={onMoveDown}
                disabled={isLast}
              >
                <ChevronDown className="w-4 h-4" />
              </Button>
            </div>
          )}

          <div className="flex-1 min-w-0 space-y-3">
            {/* Header row */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h4 className={cn(
                  "font-semibold text-base leading-tight",
                  goal.is_completed && "line-through text-muted-foreground"
                )}>
                  {goal.title || goal.content}
                </h4>
                
                {/* Target date - inline with title area */}
                {goal.target_date && !goal.is_completed && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{format(new Date(goal.target_date), 'MMM d, yyyy')}</span>
                  </div>
                )}
                
                {/* Completion date */}
                {goal.is_completed && goal.completed_at && (
                  <div className="flex items-center gap-1.5 text-xs text-primary mt-1.5">
                    <Trophy className="w-3.5 h-3.5" />
                    <span>Completed {format(new Date(goal.completed_at), 'MMM d, yyyy')}</span>
                  </div>
                )}
              </div>
              
              {/* Action buttons for completed goals */}
              {goal.is_completed && (
                <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  {onRestore && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7 hover:bg-primary/10" 
                      onClick={onRestore}
                      title="Restore to in-progress"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </Button>
                  )}
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10" 
                    onClick={onDelete}
                    title="Delete goal"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </div>

            {/* Progress section */}
            <div onClick={(e) => e.stopPropagation()}>
              <GoalProgressBar
                goal={goal}
                onIncrement={handleIncrement}
                onDecrement={onDecrementProgress}
                onSetProgress={onSetProgress}
                onComplete={handleComplete}
                showControls={!goal.is_completed}
              />
            </div>

            {/* Reflection for completed goals */}
            {goal.is_completed && goal.reflection && (
              <p className="text-sm text-muted-foreground italic border-l-2 border-primary/30 pl-3 py-1">
                "{goal.reflection}"
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
