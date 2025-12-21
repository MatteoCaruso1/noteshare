import { memo, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Goal } from '@/types';
import { GoalProgressBar } from './GoalProgressBar';
import { Calendar, Trophy, Sparkles, RotateCcw, Trash2, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface GoalCardProps {
  goal: Goal;
  onEdit: () => void;
  onDelete: () => void;
  onIncrementProgress: () => void;
  onDecrementProgress: () => void;
  onSetProgress?: (value: number) => void;
  onComplete: () => void;
  onRestore?: () => void;
  isDraggable?: boolean;
}

export const GoalCard = memo(function GoalCard({
  goal,
  onEdit,
  onDelete,
  onIncrementProgress,
  onDecrementProgress,
  onSetProgress,
  onComplete,
  onRestore,
  isDraggable = true,
}: GoalCardProps) {
  const [showConfetti, setShowConfetti] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: goal.id,
    disabled: goal.is_completed || !isDraggable,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

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
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative rounded-xl border bg-muted/40 backdrop-blur-sm transition-all duration-200",
        "hover:bg-muted/60 hover:shadow-md hover:border-primary/20",
        goal.is_completed && "bg-primary/5 border-primary/20 hover:bg-primary/10",
        showConfetti && "ring-2 ring-primary ring-offset-2 ring-offset-background",
        isDragging && "opacity-50 shadow-lg z-50"
      )}
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
        <div className="flex items-center gap-3">
          {/* Drag handle - only for non-completed goals */}
          {!goal.is_completed && isDraggable && (
            <div 
              className="flex-shrink-0 touch-none cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-muted-foreground transition-colors"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="w-5 h-5" />
            </div>
          )}

          {/* Main content - centered */}
          <div 
            className="flex-1 min-w-0 space-y-3 cursor-pointer"
            onClick={onEdit}
          >
            {/* Header row - centered */}
            <div className="text-center">
              <h4 className={cn(
                "font-semibold text-base leading-tight",
                goal.is_completed && "line-through text-muted-foreground"
              )}>
                {goal.title || goal.content}
              </h4>
              
              {/* Target date */}
              {goal.target_date && !goal.is_completed && (
                <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground mt-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{format(new Date(goal.target_date), 'MMM d, yyyy')}</span>
                </div>
              )}
              
              {/* Completion date */}
              {goal.is_completed && goal.completed_at && (
                <div className="flex items-center justify-center gap-1.5 text-xs text-primary mt-1.5">
                  <Trophy className="w-3.5 h-3.5" />
                  <span>Completed {format(new Date(goal.completed_at), 'MMM d, yyyy')}</span>
                </div>
              )}
            </div>

            {/* Progress section - centered */}
            <div onClick={(e) => e.stopPropagation()} className="flex justify-center">
              <div className="w-full max-w-xs">
                <GoalProgressBar
                  goal={goal}
                  onIncrement={handleIncrement}
                  onDecrement={onDecrementProgress}
                  onSetProgress={onSetProgress}
                  onComplete={handleComplete}
                  showControls={!goal.is_completed}
                />
              </div>
            </div>

            {/* Reflection for completed goals */}
            {goal.is_completed && goal.reflection && (
              <p className="text-sm text-muted-foreground italic border-l-2 border-primary/30 pl-3 py-1 text-center">
                "{goal.reflection}"
              </p>
            )}
          </div>

          {/* Action buttons for completed goals */}
          {goal.is_completed && (
            <div className="flex flex-col items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
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
      </div>
    </div>
  );
});
