import { useState, useEffect } from 'react';
import { PracticeSession } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RichTextarea } from '@/components/RichTextarea';
import { Clock, ArrowLeft, Save } from 'lucide-react';

interface EndSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: PracticeSession;
  noteText: string;
  onNoteTextChange: (text: string) => void;
  onSave: (sessionTitle: string, durationMinutes: number) => void;
  isSaving: boolean;
}

export function EndSessionDialog({
  open,
  onOpenChange,
  session,
  noteText,
  onNoteTextChange,
  onSave,
  isSaving,
}: EndSessionDialogProps) {
  // Calculate current duration
  const calculateDuration = () => {
    const totalElapsedMs = Date.now() - new Date(session.started_at).getTime();
    const pausedMs = session.paused_duration_ms || 0;
    const currentPauseMs = session.paused_at 
      ? Date.now() - new Date(session.paused_at).getTime() 
      : 0;
    const activeDurationMs = totalElapsedMs - pausedMs - currentPauseMs;
    return Math.max(1, Math.floor(activeDurationMs / 60000));
  };

  const [durationMinutes, setDurationMinutes] = useState(calculateDuration);

  // Update duration when dialog opens
  useEffect(() => {
    if (open) {
      setDurationMinutes(calculateDuration());
    }
  }, [open, session]);

  const handleSave = () => {
    onSave('', durationMinutes);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-md w-full p-0 gap-0 max-h-[90vh] flex flex-col"
        hideCloseButton
      >
        {/* Header with back button */}
        <DialogHeader className="p-4 pb-2 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => onOpenChange(false)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <DialogTitle className="text-xl font-semibold">Save Session</DialogTitle>
          </div>
        </DialogHeader>

        <div className="p-4 space-y-4 overflow-y-auto flex-1 min-h-0">
          {/* Duration */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Duration
            </label>
            <Input
              type="number"
              inputMode="numeric"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Math.max(1, parseInt(e.target.value) || 1))}
              min="1"
              className="w-16 bg-muted/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="text-sm text-muted-foreground">
              min
            </span>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              What did you practice?
            </label>
            <RichTextarea
              placeholder="Add notes about your session..."
              value={noteText}
              onChange={onNoteTextChange}
            />
          </div>
        </div>

        {/* Save Button - Fixed at bottom */}
        <div className="p-4 pt-2 border-t border-border shrink-0">
          <Button
            className="w-full bg-gradient-primary text-primary-foreground"
            onClick={handleSave}
            disabled={isSaving}
          >
            <Save className="w-4 h-4 mr-2" />
            Save Session
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}