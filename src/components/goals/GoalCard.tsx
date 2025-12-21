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
        isDragging && "opacity-70 scale-105 shadow-xl z-50 ring-2 ring-primary/50 rotate-1"
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

      <div className="px-3 py-3">
        <div className="flex items-center gap-2">
          {/* Drag handle - only for non-completed goals */}
          {!goal.is_completed && isDraggable && (
            <div 
              className="flex-shrink-0 touch-none cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground transition-colors"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="w-4 h-4" />
            </div>
          )}

          {/* Main content - fills available space */}
          <div 
            className="flex-1 min-w-0 space-y-2 cursor-pointer"
            onClick={onEdit}
          >
            {/* Header row - centered */}
            <div className="text-center px-1">
              <h4 className={cn(
                "font-semibold text-sm leading-snug",
                goal.is_completed && "line-through text-muted-foreground"
              )}>
                {goal.title || goal.content}
              </h4>
              
              {/* Target date */}
              {goal.target_date && !goal.is_completed && (
                <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mt-1">
                  <Calendar className="w-3 h-3" />
                  <span>{format(new Date(goal.target_date), 'MMM d')}</span>
                </div>
              )}
              
              {/* Completion date */}
              {goal.is_completed && goal.completed_at && (
                <div className="flex items-center justify-center gap-1 text-xs text-primary mt-1">
                  <Trophy className="w-3 h-3" />
                  <span>Completed {format(new Date(goal.completed_at), 'MMM d')}</span>
                </div>
              )}
            </div>

            {/* Progress section - full width */}
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
              <p className="text-xs text-muted-foreground italic border-l-2 border-primary/30 pl-2 py-0.5 text-left">
                "{goal.reflection}"
              </p>
            )}
          </div>

          {/* Action buttons for completed goals */}
          {goal.is_completed && (
            <div className="flex flex-col items-center gap-0.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
              {onRestore && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 hover:bg-primary/10" 
                  onClick={onRestore}
                  title="Restore to in-progress"
                >
                  <RotateCcw className="w-3 h-3" />
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10" 
                onClick={onDelete}
                title="Delete goal"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
