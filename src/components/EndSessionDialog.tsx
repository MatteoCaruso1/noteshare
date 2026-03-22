import { useState, useEffect } from 'react';
import { PracticeSession } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RichTextarea } from '@/components/RichTextarea';
import { PlayingWithPicker } from '@/components/PlayingWithPicker';
import { Clock, ArrowLeft, Save, Zap } from 'lucide-react';

interface EndSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: PracticeSession;
  noteText: string;
  onNoteTextChange: (text: string) => void;
  onSave: (sessionTitle: string, durationMinutes: number, playingWithIds: string[], focusLevel?: number) => void;
  isSaving: boolean;
  /** Optional callback for FTUE preview mode — bypasses real save */
  onPreviewSave?: (durationMinutes: number, noteText: string, focusLevel?: number) => void;
}

function FocusLevelSelector({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  return (
    <div className="flex items-center gap-3">
      <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <Zap className="w-4 h-4" />
        Focus level
      </label>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((level) => {
          const filled = value !== null && level <= value;
          return (
            <button
              key={level}
              type="button"
              onClick={() => onChange(value === level ? null : level)}
              className="touch-manipulation p-0"
              aria-label={`Focus level ${level}`}
            >
              <Zap
                className={`w-5 h-5 transition-colors ${
                  filled
                    ? 'text-primary fill-primary'
                    : 'text-muted-foreground/30'
                }`}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function EndSessionDialog({
  open,
  onOpenChange,
  session,
  noteText,
  onNoteTextChange,
  onSave,
  isSaving,
  onPreviewSave,
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

  const [durationInput, setDurationInput] = useState(() => String(calculateDuration()));
  const [playingWithIds, setPlayingWithIds] = useState<string[]>([]);
  const [focusLevel, setFocusLevel] = useState<number | null>(null);
  
  // Derived state for validation
  const durationMinutes = parseInt(durationInput, 10) || 0;
  const isValidDuration = durationInput.trim() !== '' && durationMinutes >= 1;

  // Update duration when dialog opens
  useEffect(() => {
    if (open) {
      setDurationInput(String(calculateDuration()));
      setPlayingWithIds([]);
      setFocusLevel(null);
    }
  }, [open, session]);

  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow empty string or numeric input
    if (value === '' || /^\d+$/.test(value)) {
      setDurationInput(value);
    }
  };

  const handleSave = () => {
    if (isValidDuration) {
      if (onPreviewSave) {
        onPreviewSave(durationMinutes, noteText, focusLevel ?? undefined);
      } else {
        onSave('', durationMinutes, playingWithIds, focusLevel ?? undefined);
      }
    }
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
              type="text"
              inputMode="numeric"
              value={durationInput}
              onChange={handleDurationChange}
              className="w-16 bg-muted/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="text-sm text-muted-foreground">
              min
            </span>
          </div>

          {/* Focus Level */}
          <FocusLevelSelector value={focusLevel} onChange={setFocusLevel} />

          {/* Playing With */}
          <PlayingWithPicker
            selectedIds={playingWithIds}
            onSelect={setPlayingWithIds}
          />

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
            data-tour="save-session-btn"
            className="w-full bg-gradient-primary text-primary-foreground"
            onClick={handleSave}
            disabled={isSaving || !isValidDuration}
          >
            <Save className="w-4 h-4 mr-2" />
            Save Session
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
