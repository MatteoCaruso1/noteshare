import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, Clock, ListChecks } from 'lucide-react';
import { Goal } from '@/types';
import { cn } from '@/lib/utils';

interface GoalProgressBarProps {
  goal: Goal;
  onIncrement?: () => void;
  onDecrement?: () => void;
  onComplete?: () => void;
  onSetProgress?: (value: number) => void;
  showControls?: boolean;
}

export function GoalProgressBar({ 
  goal, 
  onIncrement, 
  onDecrement, 
  onComplete,
  onSetProgress,
  showControls = true 
}: GoalProgressBarProps) {
  const sliderRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

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

  // Generate axis labels for step/time progress
  const getAxisLabels = () => {
    if (goal.progress_type === 'checkbox') return null;

    const target = goal.progress_type === 'step' ? goal.target_steps : goal.target_minutes;
    const unit = goal.progress_type === 'time' ? 'm' : '';
    
    // Determine reasonable number of labels based on target
    let labelCount: number;
    let step: number;
    
    if (target <= 5) {
      labelCount = target + 1;
      step = 1;
    } else if (target <= 10) {
      labelCount = target + 1;
      step = 1;
    } else if (target <= 20) {
      step = 5;
      labelCount = Math.floor(target / step) + 1;
    } else if (target <= 60) {
      step = 10;
      labelCount = Math.floor(target / step) + 1;
    } else if (target <= 120) {
      step = 20;
      labelCount = Math.floor(target / step) + 1;
    } else {
      step = Math.ceil(target / 6);
      // Round step to nice numbers
      if (step > 50) step = Math.ceil(step / 50) * 50;
      else if (step > 10) step = Math.ceil(step / 10) * 10;
      else if (step > 5) step = Math.ceil(step / 5) * 5;
      labelCount = Math.floor(target / step) + 1;
    }

    const labels = [];
    for (let i = 0; i < labelCount && i * step <= target; i++) {
      const value = i * step;
      const position = (value / target) * 100;
      labels.push({ value, position });
    }
    
    // Always include the target if it's not already there
    if (labels.length === 0 || labels[labels.length - 1].value !== target) {
      labels.push({ value: target, position: 100 });
    }

    return { labels, unit };
  };

  // Handle drag interaction for slider
  const handleSliderInteraction = useCallback((clientX: number) => {
    if (!sliderRef.current || goal.progress_type === 'checkbox' || !onSetProgress) return;
    
    const rect = sliderRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    
    const target = goal.progress_type === 'step' ? goal.target_steps : goal.target_minutes;
    const newValue = Math.round((percentage / 100) * target);
    
    onSetProgress(newValue);
  }, [goal.progress_type, goal.target_steps, goal.target_minutes, onSetProgress]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (goal.progress_type === 'checkbox' || goal.is_completed || !onSetProgress) return;
    setIsDragging(true);
    handleSliderInteraction(e.clientX);
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    handleSliderInteraction(e.clientX);
  }, [isDragging, handleSliderInteraction]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (goal.progress_type === 'checkbox' || goal.is_completed || !onSetProgress) return;
    setIsDragging(true);
    handleSliderInteraction(e.touches[0].clientX);
  };

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging) return;
    handleSliderInteraction(e.touches[0].clientX);
  }, [isDragging, handleSliderInteraction]);

  // Add/remove event listeners for drag
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove);
      document.addEventListener('touchend', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove]);

  const axisData = getAxisLabels();
  const isSlider = goal.progress_type !== 'checkbox' && onSetProgress && !goal.is_completed;
  const currentValue = goal.progress_type === 'step' ? goal.current_steps : goal.current_minutes;
  const targetValue = goal.progress_type === 'step' ? goal.target_steps : goal.target_minutes;

  const [isEditingValue, setIsEditingValue] = useState(false);
  const [editValue, setEditValue] = useState(String(currentValue));

  const handleManualValueSubmit = () => {
    const numValue = parseInt(editValue, 10);
    if (!isNaN(numValue) && onSetProgress) {
      onSetProgress(Math.max(0, Math.min(numValue, targetValue)));
    }
    setIsEditingValue(false);
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1 text-muted-foreground">
          {getIcon()}
          {/* Editable progress value for step/time goals */}
          {showControls && !goal.is_completed && goal.progress_type !== 'checkbox' ? (
            isEditingValue ? (
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onBlur={handleManualValueSubmit}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleManualValueSubmit();
                    if (e.key === 'Escape') setIsEditingValue(false);
                  }}
                  className="h-5 w-12 text-xs px-1 text-center"
                  autoFocus
                  min={0}
                  max={targetValue}
                />
                <span>/{targetValue} {goal.progress_type === 'time' ? 'min' : 'steps'}</span>
              </div>
            ) : (
              <span
                className="cursor-pointer hover:text-primary underline-offset-2 hover:underline"
                onClick={() => {
                  setEditValue(String(currentValue));
                  setIsEditingValue(true);
                }}
                title="Click to edit"
              >
                {getProgressText()}
              </span>
            )
          ) : (
            <span>{getProgressText()}</span>
          )}
        </div>
        {showControls && !goal.is_completed && (
          <div className="flex items-center gap-1">
            {onComplete && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs gap-1"
                onClick={onComplete}
              >
                <Check className="w-3 h-3" />
                Complete
              </Button>
            )}
          </div>
        )}
      </div>
      
      {/* Progress bar with slider capability */}
      <div 
        ref={sliderRef}
        className={cn(
          "relative h-3 rounded-full overflow-hidden",
          isComplete ? "bg-primary/20" : "bg-secondary",
          isSlider && "cursor-pointer touch-none select-none"
        )}
        onMouseDown={isSlider ? handleMouseDown : undefined}
        onTouchStart={isSlider ? handleTouchStart : undefined}
      >
        <div 
          className={cn(
            "absolute inset-y-0 left-0 rounded-full transition-all",
            isComplete ? "bg-primary" : "bg-primary/70"
          )}
          style={{ width: `${progress}%` }}
        />
        
        {/* Draggable thumb for step/time goals */}
        {isSlider && (
          <div 
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-primary rounded-full shadow-md border-2 border-background transition-all"
            style={{ left: `calc(${progress}% - 8px)` }}
          />
        )}
      </div>

      {/* Axis labels */}
      {axisData && (
        <div className="relative h-4 mt-1">
          {axisData.labels.map(({ value, position }, index) => (
            <div
              key={index}
              className="absolute text-[10px] text-muted-foreground transform -translate-x-1/2"
              style={{ left: `${position}%` }}
            >
              <div className="flex flex-col items-center">
                <div className="w-px h-1 bg-muted-foreground/40 mb-0.5" />
                <span className={cn(
                  value <= currentValue && "text-primary font-medium"
                )}>
                  {value}{axisData.unit}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
