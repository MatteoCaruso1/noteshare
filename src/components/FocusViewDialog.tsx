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
  const formattedDate = focusDate 
    ? format(new Date(focusDate), 'MMMM d, yyyy')
    : 'Unknown date';

  const handleRemove = () => {
    onRemove?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={true}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="flex flex-row items-center justify-between gap-2">
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Focus for {formattedDate}
          </DialogTitle>
          {canRemove && onRemove && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
              onClick={handleRemove}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
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
      </DialogContent>
    </Dialog>
  );
}
