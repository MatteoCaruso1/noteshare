import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Goal } from '@/types';
import { GoalProgressBar } from './GoalProgressBar';
import { Pencil, Trash2, ChevronUp, ChevronDown, Calendar, Trophy, Sparkles, RotateCcw } from 'lucide-react';
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

export function GoalCard({
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

  const handleComplete = () => {
    onComplete();
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 2000);
  };

  const handleIncrement = () => {
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
  };

  return (
    <Card className={cn(
      "p-3 bg-secondary/30 border-border relative overflow-hidden transition-all",
      goal.is_completed && "bg-primary/5 border-primary/20",
      showConfetti && "ring-2 ring-primary"
    )}>
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="flex gap-1 animate-bounce">
            <Sparkles className="w-5 h-5 text-primary animate-pulse" />
            <Trophy className="w-6 h-6 text-primary" />
            <Sparkles className="w-5 h-5 text-primary animate-pulse" />
          </div>
        </div>
      )}

      <div className="flex items-start gap-2">
        {showReorder && !goal.is_completed && (
          <div className="flex flex-col gap-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={onMoveUp}
              disabled={isFirst}
            >
              <ChevronUp className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={onMoveDown}
              disabled={isLast}
            >
              <ChevronDown className="w-3 h-3" />
            </Button>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <h4 className={cn(
                "font-medium text-sm truncate",
                goal.is_completed && "line-through text-muted-foreground"
              )}>
                {goal.title || goal.content}
              </h4>
              {goal.description && (
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                  {goal.description}
                </p>
              )}
            </div>
            
            {!goal.is_completed && (
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onEdit}>
                  <Pencil className="w-3 h-3" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={onDelete}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            )}
            
            {goal.is_completed && (
              <div className="flex items-center gap-1 flex-shrink-0">
                {onRestore && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6" 
                    onClick={onRestore}
                    title="Restore to in-progress"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={onDelete}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            )}
          </div>

          {goal.target_date && !goal.is_completed && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
              <Calendar className="w-3 h-3" />
              <span>Target: {format(new Date(goal.target_date), 'MMM d, yyyy')}</span>
            </div>
          )}

          {goal.is_completed && goal.completed_at && (
            <div className="flex items-center gap-1 text-xs text-primary mb-2">
              <Trophy className="w-3 h-3" />
              <span>Completed {format(new Date(goal.completed_at), 'MMM d, yyyy')}</span>
            </div>
          )}

          <GoalProgressBar
            goal={goal}
            onIncrement={handleIncrement}
            onDecrement={onDecrementProgress}
            onSetProgress={onSetProgress}
            onComplete={handleComplete}
            showControls={!goal.is_completed}
          />

          {goal.is_completed && goal.reflection && (
            <p className="mt-2 text-xs text-muted-foreground italic border-l-2 border-primary/30 pl-2">
              "{goal.reflection}"
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
