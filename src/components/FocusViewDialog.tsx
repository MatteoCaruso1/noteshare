import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Calendar } from 'lucide-react';

interface FocusViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  focusDate: string;
  focusText: string;
}

export function FocusViewDialog({ open, onOpenChange, focusDate, focusText }: FocusViewDialogProps) {
  const formattedDate = focusDate 
    ? format(new Date(focusDate), 'MMMM d, yyyy')
    : 'Unknown date';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Focus for {formattedDate}
          </DialogTitle>
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
