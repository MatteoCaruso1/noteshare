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
import { Check, ListChecks, Clock, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface GoalFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goalType: 'near-term' | 'long-term';
  goal?: Goal | null;
  onSave: (data: Partial<Goal>) => void;
  onDelete?: () => void;
  isPending?: boolean;
}

export function GoalFormDialog({
  open,
  onOpenChange,
  goalType,
  goal,
  onSave,
  onDelete,
  isPending,
}: GoalFormDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [progressType, setProgressType] = useState<'checkbox' | 'step' | 'time'>('checkbox');
  const [targetStepsInput, setTargetStepsInput] = useState('5');
  const [targetMinutesInput, setTargetMinutesInput] = useState('100');
  
  const targetSteps = parseInt(targetStepsInput) || 0;
  const targetMinutes = parseInt(targetMinutesInput) || 0;
  
  const hasValidTarget = progressType === 'checkbox' || 
    (progressType === 'step' && targetSteps > 0) ||
    (progressType === 'time' && targetMinutes > 0);

  useEffect(() => {
    if (goal) {
      setTitle(goal.title || goal.content || '');
      setDescription(goal.description || '');
      setTargetDate(goal.target_date || '');
      setProgressType(goal.progress_type || 'checkbox');
      setTargetStepsInput(String(goal.target_steps || 5));
      setTargetMinutesInput(String(goal.target_minutes || 100));
    } else {
      setTitle('');
      setDescription('');
      setTargetDate('');
      setProgressType('checkbox');
      setTargetStepsInput('5');
      setTargetMinutesInput('100');
    }
  }, [goal, open]);

  const handleTemplateSelect = (template: GoalTemplate) => {
    setTitle(template.title);
    setProgressType(template.progressType);
    if (template.targetSteps) setTargetStepsInput(String(template.targetSteps));
    if (template.targetMinutes) setTargetMinutesInput(String(template.targetMinutes));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !hasValidTarget) return;

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
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {goal ? 'Edit Goal' : 'Add Goal'}
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
                min={0}
                value={targetStepsInput}
                onChange={(e) => setTargetStepsInput(e.target.value)}
                className={targetSteps === 0 ? "border-destructive" : ""}
              />
              {targetSteps === 0 && (
                <p className="text-xs text-destructive">Target must be greater than 0</p>
              )}
            </div>
          )}

          {progressType === 'time' && (
            <div className="space-y-2">
              <Label htmlFor="targetMinutes">Target Minutes</Label>
              <Input
                id="targetMinutes"
                type="number"
                min={0}
                value={targetMinutesInput}
                onChange={(e) => setTargetMinutesInput(e.target.value)}
                className={targetMinutes === 0 ? "border-destructive" : ""}
              />
              {targetMinutes === 0 && (
                <p className="text-xs text-destructive">Target must be greater than 0</p>
              )}
            </div>
          )}

          <div className="flex justify-between gap-2 pt-2">
            {goal && onDelete ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Goal</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this goal? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        onDelete();
                        onOpenChange(false);
                      }}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <div />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending || !title.trim() || !hasValidTarget}>
                {goal ? 'Save Changes' : 'Add Goal'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
