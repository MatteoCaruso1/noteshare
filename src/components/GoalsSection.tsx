import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Target, Calendar, Lock, Globe, Pencil, Check, X } from 'lucide-react';
import { useGoals, useUpsertGoal } from '@/hooks/useGoals';
import { Goal } from '@/types';

interface GoalsSectionProps {
  profileId: string;
}

export function GoalsSection({ profileId }: GoalsSectionProps) {
  const { data: goals } = useGoals(profileId);
  const upsertGoal = useUpsertGoal();

  const nearTermGoal = goals?.find(g => g.goal_type === 'near-term');
  const longTermGoal = goals?.find(g => g.goal_type === 'long-term');

  return (
    <Card className="p-4 bg-card border-border">
      <div className="flex items-center gap-2 mb-4">
        <Target className="w-5 h-5 text-primary" />
        <h2 className="font-semibold">Goals</h2>
      </div>
      <div className="space-y-4">
        <GoalItem
          type="near-term"
          label="Near-term"
          goal={nearTermGoal}
          profileId={profileId}
          onSave={upsertGoal.mutate}
          isPending={upsertGoal.isPending}
        />
        <GoalItem
          type="long-term"
          label="Long-term"
          goal={longTermGoal}
          profileId={profileId}
          onSave={upsertGoal.mutate}
          isPending={upsertGoal.isPending}
        />
      </div>
    </Card>
  );
}

interface GoalItemProps {
  type: 'near-term' | 'long-term';
  label: string;
  goal?: Goal;
  profileId: string;
  onSave: (params: any) => void;
  isPending: boolean;
}

function GoalItem({ type, label, goal, profileId, onSave, isPending }: GoalItemProps) {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(goal?.content || '');
  const [targetDate, setTargetDate] = useState(goal?.target_date || '');
  const [visibility, setVisibility] = useState<'public' | 'private'>(goal?.visibility || 'private');

  useEffect(() => {
    setContent(goal?.content || '');
    setTargetDate(goal?.target_date || '');
    setVisibility(goal?.visibility || 'private');
  }, [goal]);

  const handleSave = () => {
    if (!content.trim()) return;
    onSave({
      id: goal?.id,
      userId: profileId,
      goalType: type,
      content: content.trim(),
      targetDate: targetDate || null,
      visibility,
    });
    setEditing(false);
  };

  const handleCancel = () => {
    setContent(goal?.content || '');
    setTargetDate(goal?.target_date || '');
    setVisibility(goal?.visibility || 'private');
    setEditing(false);
  };

  if (!editing && !goal) {
    return (
      <div className="p-3 bg-secondary/30 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-muted-foreground">{label}</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setEditing(true)}
          className="w-full text-muted-foreground"
        >
          + Set {label.toLowerCase()} goal
        </Button>
      </div>
    );
  }

  if (!editing && goal) {
    return (
      <div className="p-3 bg-secondary/30 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">{label}</span>
            {goal.visibility === 'private' ? (
              <Lock className="w-3 h-3 text-muted-foreground" />
            ) : (
              <Globe className="w-3 h-3 text-muted-foreground" />
            )}
          </div>
          <div className="flex items-center gap-2">
            {goal.target_date && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(goal.target_date).toLocaleDateString()}
              </span>
            )}
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditing(true)}>
              <Pencil className="w-3 h-3" />
            </Button>
          </div>
        </div>
        <p className="text-sm">{goal.content}</p>
      </div>
    );
  }

  return (
    <div className="p-3 bg-secondary/50 rounded-lg space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <Select value={visibility} onValueChange={(v) => setVisibility(v as 'public' | 'private')}>
          <SelectTrigger className="w-28 h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="private">
              <div className="flex items-center gap-1">
                <Lock className="w-3 h-3" /> Private
              </div>
            </SelectItem>
            <SelectItem value="public">
              <div className="flex items-center gap-1">
                <Globe className="w-3 h-3" /> Public
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Textarea
        placeholder={`What's your ${label.toLowerCase()} goal?`}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={2}
        className="resize-none text-sm"
      />
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 flex-1">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <Input
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            className="flex-1 h-8 text-sm"
          />
        </div>
        <Button size="sm" variant="ghost" onClick={handleCancel} disabled={isPending}>
          <X className="w-4 h-4" />
        </Button>
        <Button size="sm" onClick={handleSave} disabled={isPending || !content.trim()}>
          <Check className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}