import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar, X } from 'lucide-react';

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Focus for {formattedDate}
          </DialogTitle>
          <DialogDescription className="sr-only">
            View the focus text that was saved with this note
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 space-y-4">
          <div className="p-4 bg-muted/50 rounded-lg border border-border">
            <p className="text-sm whitespace-pre-wrap">
              {focusText || 'No focus text recorded'}
            </p>
          </div>
          {canRemove && onRemove && (
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2 text-muted-foreground hover:text-destructive hover:border-destructive"
              onClick={handleRemove}
            >
              <X className="w-4 h-4" />
              Remove focus from this note
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
