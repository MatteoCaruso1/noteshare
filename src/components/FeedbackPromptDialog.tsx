import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { FeedbackDialog } from './FeedbackDialog';

const FEEDBACK_PROMPT_KEY = 'noteshare_feedback_prompt_shown_v1';

export function hasFeedbackPromptBeenShown(): boolean {
  return localStorage.getItem(FEEDBACK_PROMPT_KEY) === 'true';
}

export function markFeedbackPromptShown(): void {
  localStorage.setItem(FEEDBACK_PROMPT_KEY, 'true');
}

interface FeedbackPromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FeedbackPromptDialog({ open, onOpenChange }: FeedbackPromptDialogProps) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const handleGiveFeedback = () => {
    onOpenChange(false);
    // Small delay so the first dialog closes before the second opens
    setTimeout(() => setFeedbackOpen(true), 150);
  };

  const handleMaybeLater = () => {
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader className="text-center items-center">
            <DialogTitle className="text-lg">
              Help Us Build This With You
            </DialogTitle>
            <DialogDescription className="text-center pt-1">
              <p className="text-sm">
                As a valued user, we want to build a product you actually want to use. Your feedback means a lot to us.
              </p>
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 pt-2">
            <Button
              size="sm"
              onClick={handleGiveFeedback}
              className="w-full"
            >
              Give Feedback
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMaybeLater}
              className="w-full text-muted-foreground"
            >
              Maybe Later
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <FeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </>
  );
}
