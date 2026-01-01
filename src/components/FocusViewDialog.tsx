import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar, Trash2 } from 'lucide-react';

interface FocusViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  focusDate: string;
  focusText: string;
  onRemove?: () => void;
  canRemove?: boolean;
}

export function FocusViewDialog({ 
  open, 
  onOpenChange, 
  focusDate, 
  focusText,
  onRemove,
  canRemove = false,
}: FocusViewDialogProps) {
  // Parse date parts directly to avoid timezone conversion issues
  const formattedDate = focusDate 
    ? (() => {
        const [year, month, day] = focusDate.split('-').map(Number);
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December'];
        return `${months[month - 1]} ${day}, ${year}`;
      })()
    : 'Unknown date';

  const handleRemove = () => {
    onRemove?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={true}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Ongoing Focus for {formattedDate}
          </DialogTitle>
          <DialogDescription className="sr-only">
            View the focus text that was saved with this note
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <div className="p-4 bg-muted/50 rounded-lg border border-border">
            <p className="text-sm whitespace-pre-wrap">
              {focusText || 'No focus text recorded'}
            </p>
          </div>
        </div>
        {canRemove && onRemove && (
          <div className="mt-4 pt-4 border-t border-border">
            <Button
              variant="outline"
              className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
              onClick={handleRemove}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Remove Focus
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
