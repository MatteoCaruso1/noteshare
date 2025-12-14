import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Trophy, Sparkles } from 'lucide-react';
import { Goal } from '@/types';

interface CompletionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal: Goal | null;
  onComplete: (reflection?: string) => void;
}

export function CompletionDialog({
  open,
  onOpenChange,
  goal,
  onComplete,
}: CompletionDialogProps) {
  const [reflection, setReflection] = useState('');

  const handleComplete = () => {
    onComplete(reflection.trim() || undefined);
    setReflection('');
    onOpenChange(false);
  };

  if (!goal) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            Goal Complete!
            <Sparkles className="w-5 h-5 text-primary" />
          </DialogTitle>
          <DialogDescription>
            Congratulations on completing "{goal.title || goal.content}"!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 bg-primary/10 rounded-lg text-center">
            <div className="flex justify-center gap-2 mb-2">
              <Sparkles className="w-6 h-6 text-primary animate-pulse" />
              <Trophy className="w-8 h-8 text-primary" />
              <Sparkles className="w-6 h-6 text-primary animate-pulse" />
            </div>
            <p className="text-sm font-medium">You did it!</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reflection">What did you learn from this goal? (optional)</Label>
            <Textarea
              id="reflection"
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              placeholder="Reflect on your achievement..."
              rows={3}
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={handleComplete}>
              Complete Goal
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
