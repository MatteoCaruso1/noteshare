import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Flame } from 'lucide-react';

interface ThreeDayStreakDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ThreeDayStreakDialog({ open, onOpenChange }: ThreeDayStreakDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader className="text-center items-center">
          <div className="p-3 rounded-full bg-orange-500/10 mb-1">
            <Flame className="w-10 h-10 text-orange-500" />
          </div>
          <DialogTitle className="text-lg text-orange-600 dark:text-orange-400">
            You're on a 3-day streak!
          </DialogTitle>
          <DialogDescription className="text-center space-y-2 pt-1">
            <p className="text-sm">
              Great work – consistency is the most important part of practice.
            </p>
            <p className="text-sm text-muted-foreground italic">
              When you get to 10 days, you get a trophy on your profile that is yours forever.
            </p>
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="px-6"
          >
            Got it!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
