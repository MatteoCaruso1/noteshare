import { useState, useMemo } from 'react';
import { useGoals, useCreateGoal, useUpdateGoal, useDeleteGoal } from '@/hooks/useGoals';
import { Target, X, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

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

export function SimpleGoals({ profileId }: SimpleGoalsProps) {
  const { data: goals = [] } = useGoals(profileId);
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();

  // Only show active (non-completed) goals, sorted by priority
  const activeGoals = goals
    .filter(g => !g.is_completed)
    .sort((a, b) => a.priority - b.priority)
    .slice(0, MAX_GOALS);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newGoalText, setNewGoalText] = useState('');

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
      createGoal.mutate({
        userId: profileId,
        goalType: 'long-term',
        title: newGoalText.trim(),
        progressType: 'checkbox',
      });
      setNewGoalText('');
      setIsAdding(false);
    }
  };

  const handleDeleteGoal = (goalId: string) => {
    deleteGoal.mutate(goalId);
  };

  const canAddMore = activeGoals.length < MAX_GOALS;

  const hasGoals = activeGoals.length > 0 || isAdding;

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className={cn(
        "flex items-center",
        hasGoals ? "justify-between mb-2" : "justify-center"
      )}>
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-primary" />
          <span className="text-base font-medium text-foreground">Musical Goals</span>
        </div>
        {canAddMore && !isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>
      
      {hasGoals && (
        <div className="space-y-1.5">
          {activeGoals.map((goal, index) => (
            <div key={goal.id} className="group flex items-center gap-2">
              <span className="w-4 text-primary text-xs font-semibold flex-shrink-0">
                {index + 1}.
              </span>
              
              {editingId === goal.id ? (
                <Input
                  autoFocus
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onBlur={() => handleSaveEdit(goal.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveEdit(goal.id);
                    if (e.key === 'Escape') handleCancelEdit();
                  }}
                  className="h-6 text-sm py-0 px-1.5 flex-1"
                  maxLength={80}
                />
              ) : (
                <>
                  <span
                    onClick={() => handleStartEdit(goal.id, goal.title || goal.content)}
                    className="text-sm cursor-pointer hover:text-primary transition-colors flex-1 truncate"
                  >
                    {goal.title || goal.content}
                  </span>
                  <button
                    onClick={() => handleDeleteGoal(goal.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:text-destructive"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </>
              )}
            </div>
          ))}
          
          {isAdding && (
            <div className="flex items-center gap-2">
              <span className="w-4 text-primary text-xs font-semibold flex-shrink-0">
                {activeGoals.length + 1}.
              </span>
              <Input
                autoFocus
                value={newGoalText}
                onChange={(e) => setNewGoalText(e.target.value)}
                onBlur={() => {
                  if (newGoalText.trim()) handleAddGoal();
                  else setIsAdding(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddGoal();
                  if (e.key === 'Escape') {
                    setIsAdding(false);
                    setNewGoalText('');
                  }
                }}
                placeholder={examplePlaceholder}
                className="h-6 text-sm py-0 px-1.5 flex-1"
                maxLength={80}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
