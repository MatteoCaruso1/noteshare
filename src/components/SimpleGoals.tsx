import { useState, useMemo } from 'react';
import { useGoals, useCreateGoal, useUpdateGoal, useDeleteGoal } from '@/hooks/useGoals';
import { Compass, X, Plus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { useWeeklyGoal, useCurrentWeekPracticeMinutes } from '@/hooks/useWeeklyGoal';
import { useAuth } from '@/hooks/useAuth';
import { usePremium } from '@/contexts/PremiumContext';

interface SimpleGoalsProps {
  profileId: string;
}

const MAX_GOALS = 3;

const EXAMPLE_GOALS = [
  "Play 10 jazz standards from memory",
  "Release my first album before 2027",
  "Perform 10 live shows in 2026",
  "Develop my recognizable sound in 2026",
  "Write and produce 10 original songs",
  "Practice intentionally for 300 hours in 2026",
  "Play at the Emmet Ray Jam before winter ends",
];

// Format minutes to readable format (e.g., "45m" or "1h 30m")
function formatMinutes(mins: number): string {
  if (mins >= 60) {
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
  }
  return `${mins}m`;
}

export function SimpleGoals({ profileId }: SimpleGoalsProps) {
  const { data: goals = [], isLoading } = useGoals(profileId);
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();
  
  // Weekly goal data
  const { profile } = useAuth();
  const { isPremium } = usePremium();
  const { currentWeekGoal, isLoading: weeklyLoading } = useWeeklyGoal(profile?.id);
  const { minutes: currentMinutes, isLoading: minutesLoading } = useCurrentWeekPracticeMinutes(profile?.id);

  // Only show active (non-completed) goals, sorted by priority
  const activeGoals = goals
    .filter(g => !g.is_completed)
    .sort((a, b) => a.priority - b.priority)
    .slice(0, MAX_GOALS);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newGoalText, setNewGoalText] = useState('');
  
  
  // Check if weekly goal should be shown
  const showWeeklyGoal = !weeklyLoading && currentWeekGoal && !currentWeekGoal.skipped;
  const weeklyTargetMinutes = currentWeekGoal?.target_minutes || 0;
  const weeklyProgressPercent = weeklyTargetMinutes > 0 ? Math.min(100, (currentMinutes / weeklyTargetMinutes) * 100) : 0;
  const isWeeklyComplete = currentMinutes >= weeklyTargetMinutes && !minutesLoading;

  // Pick a random example goal when adding starts
  const examplePlaceholder = useMemo(() => {
    return `e.g., ${EXAMPLE_GOALS[Math.floor(Math.random() * EXAMPLE_GOALS.length)]}`;
  }, [isAdding]);

  const handleStartEdit = (goalId: string, currentText: string) => {
    setEditingId(goalId);
    setEditText(currentText);
  };

  const handleSaveEdit = (goalId: string) => {
    if (editText.trim()) {
      updateGoal.mutate({ id: goalId, title: editText.trim(), content: editText.trim() });
    }
    setEditingId(null);
    setEditText('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const handleAddGoal = () => {
    if (newGoalText.trim() && activeGoals.length < MAX_GOALS) {
      const goalText = newGoalText.trim();
      setNewGoalText('');
      setIsAdding(false);
      createGoal.mutate({
        userId: profileId,
        goalType: 'long-term',
        title: goalText,
        progressType: 'checkbox',
      });
    }
  };

  const handleDeleteGoal = (goalId: string) => {
    deleteGoal.mutate(goalId);
  };

  const canAddMore = activeGoals.length < MAX_GOALS;

  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAdding(true);
  };

  // Icon should light up when editing or adding
  const isActive = isAdding || editingId !== null;
  
  // Calculate next goal number (weekly goal comes after custom goals)
  const weeklyGoalNumber = activeGoals.length + (pendingGoal ? 1 : 0) + 1;

  // Show loading skeleton with stable min-height to prevent layout shifts
  if (isLoading) {
    return (
      <Card className="bg-card border-border p-4 min-h-[140px]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-foreground" />
            <h2 className="font-semibold">Musical Goals</h2>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <span className="w-5 text-muted-foreground text-xs font-semibold flex-shrink-0 pt-0.5">1.</span>
            <Skeleton className="h-5 flex-1" />
          </div>
          <div className="flex items-start gap-2">
            <span className="w-5 text-muted-foreground text-xs font-semibold flex-shrink-0 pt-0.5">2.</span>
            <Skeleton className="h-5 flex-1 w-3/4" />
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border p-4 min-h-[140px]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Compass className={`w-5 h-5 transition-colors ${isActive ? 'text-primary' : 'text-foreground'}`} />
          <h2 className="font-semibold">Musical Goals</h2>
        </div>
        {canAddMore && !isAdding && (
          <button
            onClick={handleAddClick}
            className="p-1 hover:bg-muted rounded transition-colors"
          >
            <Plus className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />
          </button>
        )}
      </div>
      
      <div className="space-y-2">
        {activeGoals.map((goal, index) => (
          <div key={goal.id} className="group flex items-start gap-2 animate-fade-in">
            <span className="w-5 text-muted-foreground text-xs font-semibold flex-shrink-0 flex items-center justify-center pt-0.5">
              {index + 1}.
            </span>
            
            {editingId === goal.id ? (
              <Textarea
                autoFocus
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onBlur={() => handleSaveEdit(goal.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSaveEdit(goal.id);
                  }
                  if (e.key === 'Escape') handleCancelEdit();
                }}
                className="text-sm py-1 px-1.5 flex-1 min-h-[28px] resize-none"
                rows={1}
              />
            ) : (
              <>
                <span
                  onClick={() => handleStartEdit(goal.id, goal.title || goal.content)}
                  className="text-sm cursor-pointer hover:text-primary transition-colors flex-1 whitespace-pre-wrap break-words"
                >
                  {goal.title || goal.content}
                </span>
                <button
                  onClick={() => handleDeleteGoal(goal.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:text-destructive flex-shrink-0"
                >
                  <X className="w-3 h-3" />
                </button>
              </>
            )}
          </div>
        ))}

        {/* Optimistic pending goal */}
        {pendingGoal && (
          <div className="flex items-start gap-2 opacity-60 animate-fade-in">
            <span className="w-5 text-muted-foreground text-xs font-semibold flex-shrink-0 flex items-center justify-center pt-0.5">
              {activeGoals.length + 1}.
            </span>
            <span className="text-sm flex-1 whitespace-pre-wrap break-words">
              {pendingGoal}
            </span>
          </div>
        )}
        
        {isAdding && (
          <div className="flex items-start gap-2 animate-fade-in">
            <span className="w-5 text-muted-foreground text-xs font-semibold flex-shrink-0 flex items-center justify-center pt-0.5">
              {activeGoals.length + 1}.
            </span>
            <Textarea
              autoFocus
              value={newGoalText}
              onChange={(e) => setNewGoalText(e.target.value)}
              onBlur={() => {
                if (newGoalText.trim()) handleAddGoal();
                else setIsAdding(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAddGoal();
                }
                if (e.key === 'Escape') {
                  setIsAdding(false);
                  setNewGoalText('');
                }
              }}
              placeholder={examplePlaceholder}
              className="text-sm py-1 px-1.5 flex-1 min-h-[28px] resize-none"
              rows={1}
            />
          </div>
        )}

        {/* Weekly Practice Goal - integrated as next numbered goal */}
        {showWeeklyGoal && (
          <div className="flex flex-col gap-1 animate-fade-in">
            <div className="flex items-start gap-2">
              <span className={`w-5 text-xs font-semibold flex-shrink-0 flex items-center justify-center pt-0.5 ${
                isWeeklyComplete ? 'text-green-500' : 'text-muted-foreground'
              }`}>
                {weeklyGoalNumber}.
              </span>
              <span className={`text-sm flex-1 ${isWeeklyComplete ? 'text-green-500' : ''}`}>
                Weekly practice goal:{' '}
                {minutesLoading ? (
                  <Skeleton className="inline-block h-4 w-10 align-middle" />
                ) : (
                  <span className="font-medium">{formatMinutes(currentMinutes)}</span>
                )}
                <span className="text-muted-foreground"> / {formatMinutes(weeklyTargetMinutes)}</span>
                {isWeeklyComplete && ' 🎉'}
              </span>
            </div>
            {/* Styled progress bar with skewed edges */}
            <div className="ml-5 pl-2">
              <div className="h-2 w-full bg-muted/30 overflow-hidden" style={{ clipPath: 'polygon(0 0, 100% 0, 98% 100%, 2% 100%)' }}>
                <div 
                  className={`h-full transition-all duration-500 ${
                    isWeeklyComplete ? 'bg-green-500' : 'bg-primary/70'
                  }`}
                  style={{ 
                    width: `${weeklyProgressPercent}%`,
                    clipPath: 'polygon(0 0, 100% 0, 96% 100%, 0 100%)'
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {activeGoals.length === 0 && !isAdding && !pendingGoal && !showWeeklyGoal && (
          <p className="text-sm text-muted-foreground animate-fade-in">No goals yet. Click + to add one.</p>
        )}
      </div>
    </Card>
  );
}
