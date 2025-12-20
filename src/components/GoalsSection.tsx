import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Target, Plus, ChevronDown, ChevronUp, Trophy, ChevronRight } from 'lucide-react';
import { useGoals, useCreateGoal, useUpdateGoal, useDeleteGoal, useReorderGoal, useCompleteGoal, useIncrementProgress, useDecrementProgress, useSetProgress, useRestoreGoal } from '@/hooks/useGoals';
import { Goal } from '@/types';
import { GoalCard } from './goals/GoalCard';
import { GoalFormDialog } from './goals/GoalFormDialog';
import { CompletionDialog } from './goals/CompletionDialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface GoalsSectionProps {
  profileId: string;
}

const GOALS_EXPANDED_KEY = 'noteshare_goals_expanded';

export function GoalsSection({ profileId }: GoalsSectionProps) {
  const { data: goals = [] } = useGoals(profileId);
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();
  const reorderGoal = useReorderGoal();
  const completeGoal = useCompleteGoal();
  const incrementProgress = useIncrementProgress();
  const decrementProgress = useDecrementProgress();
  const setProgress = useSetProgress();
  const restoreGoal = useRestoreGoal();

  // Main collapsible state - default collapsed, persist in localStorage
  const [isExpanded, setIsExpanded] = useState(() => {
    const stored = localStorage.getItem(GOALS_EXPANDED_KEY);
    return stored === 'true';
  });

  const [formOpen, setFormOpen] = useState(false);
  // Unified goals: always use 'long-term' type for new goals (preserves all functionality)
  const [formGoalType, setFormGoalType] = useState<'near-term' | 'long-term'>('long-term');
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [completionGoal, setCompletionGoal] = useState<Goal | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);

  // Persist expanded state
  useEffect(() => {
    localStorage.setItem(GOALS_EXPANDED_KEY, String(isExpanded));
  }, [isExpanded]);

  // Unified goals list - combines both near-term and long-term into one list
  const activeGoals = useMemo(() => 
    goals.filter(g => !g.is_completed).sort((a, b) => a.priority - b.priority),
    [goals]
  );
  const completedGoals = useMemo(() => 
    goals.filter(g => g.is_completed),
    [goals]
  );

  const handleAddGoal = useCallback(() => {
    // Unified: always create as 'long-term' to get full functionality
    setFormGoalType('long-term');
    setEditingGoal(null);
    setFormOpen(true);
  }, []);

  const handleEditGoal = useCallback((goal: Goal) => {
    setFormGoalType(goal.goal_type);
    setEditingGoal(goal);
    setFormOpen(true);
  }, []);

  const handleSaveGoal = useCallback((data: Partial<Goal>) => {
    if (data.id) {
      updateGoal.mutate({ id: data.id, ...data });
    } else {
      createGoal.mutate({
        userId: profileId,
        goalType: formGoalType,
        title: data.title || data.content || '',
        description: data.description,
        targetDate: data.target_date,
        progressType: data.progress_type || 'checkbox',
        targetSteps: data.target_steps,
        targetMinutes: data.target_minutes,
      });
    }
  }, [createGoal, updateGoal, profileId, formGoalType]);

  const handleMoveGoal = useCallback((goal: Goal, direction: 'up' | 'down') => {
    // Unified: reorder across all active goals
    const currentIndex = activeGoals.findIndex(g => g.id === goal.id);
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    
    if (targetIndex < 0 || targetIndex >= activeGoals.length) return;

    const targetGoal = activeGoals[targetIndex];
    
    // Swap priorities
    reorderGoal.mutate({ goalId: goal.id, newPriority: targetGoal.priority });
    reorderGoal.mutate({ goalId: targetGoal.id, newPriority: goal.priority });
  }, [activeGoals, reorderGoal]);

  const handleCompleteGoal = (goal: Goal) => {
    // Unified: always show completion dialog for reflection
    setCompletionGoal(goal);
  };

  const handleConfirmComplete = (reflection?: string) => {
    if (completionGoal) {
      completeGoal.mutate({ goalId: completionGoal.id, reflection });
    }
  };

  const handleIncrementProgress = (goal: Goal) => {
    const field = goal.progress_type === 'step' ? 'current_steps' : 'current_minutes';
    incrementProgress.mutate({ goalId: goal.id, field });
  };

  const handleDecrementProgress = (goal: Goal) => {
    const field = goal.progress_type === 'step' ? 'current_steps' : 'current_minutes';
    decrementProgress.mutate({ goalId: goal.id, field });
  };

  const handleSetProgress = (goal: Goal, value: number) => {
    const field = goal.progress_type === 'step' ? 'current_steps' : 'current_minutes';
    setProgress.mutate({ goalId: goal.id, field, value });
  };

  const handleRestoreGoal = (goal: Goal) => {
    restoreGoal.mutate({ goalId: goal.id, goalType: goal.goal_type });
  };

  const renderGoalList = () => {
    return (
      <div className="space-y-2">
        {activeGoals.map((goal, index) => (
          <GoalCard
            key={goal.id}
            goal={goal}
            onEdit={() => handleEditGoal(goal)}
            onDelete={() => deleteGoal.mutate(goal.id)}
            onMoveUp={() => handleMoveGoal(goal, 'up')}
            onMoveDown={() => handleMoveGoal(goal, 'down')}
            onIncrementProgress={() => handleIncrementProgress(goal)}
            onDecrementProgress={() => handleDecrementProgress(goal)}
            onSetProgress={(value) => handleSetProgress(goal, value)}
            onComplete={() => handleCompleteGoal(goal)}
            isFirst={index === 0}
            isLast={index === activeGoals.length - 1}
          />
        ))}
        <Button
          variant="outline"
          size="sm"
          className="w-full text-muted-foreground"
          onClick={handleAddGoal}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Goal
        </Button>
      </div>
    );
  };

  return (
    <Card className="bg-card border-border">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <button className="w-full p-4 flex items-center justify-between transition-colors rounded-lg group">
            <div className="flex items-center gap-2">
              <Target className={`w-5 h-5 transition-colors ${isExpanded ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`} />
              <h2 className="font-semibold">Goals</h2>
            </div>
            {isExpanded ? (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            )}
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-4">
            {/* Unified Goals List */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-muted-foreground/60">always private</span>
              </div>
              {renderGoalList()}
            </div>

            {/* Completed Goals */}
            {completedGoals.length > 0 && (
              <Collapsible open={showCompleted} onOpenChange={setShowCompleted}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4" />
                      <span>Completed Goals ({completedGoals.length})</span>
                    </div>
                    {showCompleted ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 mt-2">
                  {completedGoals.map((goal) => (
                    <GoalCard
                      key={goal.id}
                      goal={goal}
                      onEdit={() => {}}
                      onDelete={() => deleteGoal.mutate(goal.id)}
                      onIncrementProgress={() => {}}
                      onDecrementProgress={() => {}}
                      onComplete={() => {}}
                      onRestore={() => handleRestoreGoal(goal)}
                      showReorder={false}
                    />
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      <GoalFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        goalType={formGoalType}
        goal={editingGoal}
        onSave={handleSaveGoal}
        onDelete={editingGoal ? () => deleteGoal.mutate(editingGoal.id) : undefined}
        isPending={createGoal.isPending || updateGoal.isPending}
      />

      <CompletionDialog
        open={!!completionGoal}
        onOpenChange={(open) => !open && setCompletionGoal(null)}
        goal={completionGoal}
        onComplete={handleConfirmComplete}
      />
    </Card>
  );
}
