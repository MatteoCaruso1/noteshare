import { useState, useEffect } from 'react';
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
  const [formGoalType, setFormGoalType] = useState<'near-term' | 'long-term'>('near-term');
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [completionGoal, setCompletionGoal] = useState<Goal | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);

  // Persist expanded state
  useEffect(() => {
    localStorage.setItem(GOALS_EXPANDED_KEY, String(isExpanded));
  }, [isExpanded]);

  const nearTermGoals = goals.filter(g => g.goal_type === 'near-term' && !g.is_completed);
  const longTermGoals = goals.filter(g => g.goal_type === 'long-term' && !g.is_completed);
  const completedGoals = goals.filter(g => g.is_completed);

  const handleAddGoal = (type: 'near-term' | 'long-term') => {
    setFormGoalType(type);
    setEditingGoal(null);
    setFormOpen(true);
  };

  const handleEditGoal = (goal: Goal) => {
    setFormGoalType(goal.goal_type);
    setEditingGoal(goal);
    setFormOpen(true);
  };

  const handleSaveGoal = (data: Partial<Goal>) => {
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
  };

  const handleMoveGoal = (goal: Goal, direction: 'up' | 'down') => {
    const sameTypeGoals = goals
      .filter(g => g.goal_type === goal.goal_type && !g.is_completed)
      .sort((a, b) => a.priority - b.priority);
    
    const currentIndex = sameTypeGoals.findIndex(g => g.id === goal.id);
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    
    if (targetIndex < 0 || targetIndex >= sameTypeGoals.length) return;

    const targetGoal = sameTypeGoals[targetIndex];
    
    // Swap priorities
    reorderGoal.mutate({ goalId: goal.id, newPriority: targetGoal.priority });
    reorderGoal.mutate({ goalId: targetGoal.id, newPriority: goal.priority });
  };

  const handleCompleteGoal = (goal: Goal) => {
    // Only show completion dialog for long-term goals
    if (goal.goal_type === 'long-term') {
      setCompletionGoal(goal);
    } else {
      // For near-term goals, complete directly without dialog
      completeGoal.mutate({ goalId: goal.id });
    }
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

  const renderGoalList = (goalsList: Goal[], type: 'near-term' | 'long-term') => {
    const sortedGoals = [...goalsList].sort((a, b) => a.priority - b.priority);
    
    return (
      <div className="space-y-2">
        {sortedGoals.map((goal, index) => (
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
            isLast={index === sortedGoals.length - 1}
          />
        ))}
        <Button
          variant="outline"
          size="sm"
          className="w-full text-muted-foreground"
          onClick={() => handleAddGoal(type)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add {type === 'near-term' ? 'Near-Term' : 'Long-Term'} Goal
        </Button>
      </div>
    );
  };

  return (
    <Card className="bg-card border-border">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <button className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors rounded-lg">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
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
          <div className="px-4 pb-4 space-y-6">
            {/* Near-Term Goals */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Near-Term Goals</h3>
              {renderGoalList(nearTermGoals, 'near-term')}
            </div>

            {/* Long-Term Goals */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Long-Term Goals</h3>
              {renderGoalList(longTermGoals, 'long-term')}
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
