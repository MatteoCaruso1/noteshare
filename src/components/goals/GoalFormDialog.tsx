import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Goal } from '@/types';
import { GoalTemplates, GoalTemplate } from './GoalTemplates';
import { Check, ListChecks, Clock } from 'lucide-react';

interface GoalFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goalType: 'near-term' | 'long-term';
  goal?: Goal | null;
  onSave: (data: Partial<Goal>) => void;
  isPending?: boolean;
}

export function GoalFormDialog({
  open,
  onOpenChange,
  goalType,
  goal,
  onSave,
  isPending,
}: GoalFormDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [progressType, setProgressType] = useState<'checkbox' | 'step' | 'time'>('checkbox');
  const [targetSteps, setTargetSteps] = useState(5);
  const [targetMinutes, setTargetMinutes] = useState(100);

  useEffect(() => {
    if (goal) {
      setTitle(goal.title || goal.content || '');
      setDescription(goal.description || '');
      setTargetDate(goal.target_date || '');
      setProgressType(goal.progress_type || 'checkbox');
      setTargetSteps(goal.target_steps || 5);
      setTargetMinutes(goal.target_minutes || 100);
    } else {
      setTitle('');
      setDescription('');
      setTargetDate('');
      setProgressType('checkbox');
      setTargetSteps(5);
      setTargetMinutes(100);
    }
  }, [goal, open]);

  const handleTemplateSelect = (template: GoalTemplate) => {
    setTitle(template.title);
    setProgressType(template.progressType);
    if (template.targetSteps) setTargetSteps(template.targetSteps);
    if (template.targetMinutes) setTargetMinutes(template.targetMinutes);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onSave({
      id: goal?.id,
      title: title.trim(),
      content: title.trim(),
      description: description.trim() || null,
      target_date: targetDate || null,
      progress_type: progressType,
      target_steps: progressType === 'step' ? targetSteps : 1,
      target_minutes: progressType === 'time' ? targetMinutes : 0,
      goal_type: goalType,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {goal ? 'Edit Goal' : `Add ${goalType === 'near-term' ? 'Near-Term' : 'Long-Term'} Goal`}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!goal && (
            <GoalTemplates goalType={goalType} onSelect={handleTemplateSelect} />
          )}

          <div className="space-y-2">
            <Label htmlFor="title">Goal Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What do you want to achieve?"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add more details..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetDate">Target Date (optional)</Label>
            <Input
              id="targetDate"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />
          </div>

          <div className="space-y-3">
            <Label>Goal Type</Label>
            <RadioGroup value={progressType} onValueChange={(v) => setProgressType(v as typeof progressType)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="checkbox" id="checkbox" />
                <Label htmlFor="checkbox" className="flex items-center gap-2 font-normal cursor-pointer">
                  <Check className="w-4 h-4" />
                  Checkbox (mark complete)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="step" id="step" />
                <Label htmlFor="step" className="flex items-center gap-2 font-normal cursor-pointer">
                  <ListChecks className="w-4 h-4" />
                  Steps (X of Y completed)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="time" id="time" />
                <Label htmlFor="time" className="flex items-center gap-2 font-normal cursor-pointer">
                  <Clock className="w-4 h-4" />
                  Time (minutes practiced)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {progressType === 'step' && (
            <div className="space-y-2">
              <Label htmlFor="targetSteps">Total Steps</Label>
              <Input
                id="targetSteps"
                type="number"
                min={1}
                value={targetSteps}
                onChange={(e) => setTargetSteps(parseInt(e.target.value) || 1)}
              />
            </div>
          )}

          {progressType === 'time' && (
            <div className="space-y-2">
              <Label htmlFor="targetMinutes">Target Minutes</Label>
              <Input
                id="targetMinutes"
                type="number"
                min={1}
                value={targetMinutes}
                onChange={(e) => setTargetMinutes(parseInt(e.target.value) || 1)}
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !title.trim()}>
              {goal ? 'Save Changes' : 'Add Goal'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
