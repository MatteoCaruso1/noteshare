import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Lightbulb } from 'lucide-react';

import tipShareStats from '@/assets/tips/tip-share-stats.png';
import tipShareButtonLocation from '@/assets/tips/tip-share-button-location.png';
import tipPracticeCalendarResult from '@/assets/tips/tip-practice-calendar-result.png';
import tipPracticeRoutine from '@/assets/tips/tip-practice-routine.png';
import tipFolder from '@/assets/tips/tip-folder.png';
import tipLockScreen from '@/assets/tips/tip-lock-screen.png';
import tipWeeklyGoal from '@/assets/tips/tip-weekly-goal.png';

interface TipData {
  text: string;
  image: string;
  images?: string[];
}

const TIPS: TipData[] = [
  {
    text: 'Share your practice calendar, notes, profile and more with friends outside Noteshare! Tap the share icon to get started.',
    image: tipShareStats,
    images: [tipShareButtonLocation, tipPracticeCalendarResult],
  },
  {
    text: 'The practice routine feature is a great way to continuously come back to concepts you are working on. Tap the routine title to toggle between all your existing routines.',
    image: tipPracticeRoutine,
  },
  {
    text: 'The Folder feature in Organize is often underlooked! For example, create a Folder that lists all the songs you are working on so you have a running list of all your repertoire directly in Noteshare.',
    image: tipFolder,
  },
  {
    text: 'On mobile, press the unlock screen button to prevent your phone from closing during a session.',
    image: tipLockScreen,
  },
  {
    text: 'Set a weekly practice goal every Monday to drive practice motivation. You can view your weekly progress against this goal in the Organize tab.',
    image: tipWeeklyGoal,
  },
];

interface ProTipsDialogProps {
  tipIndex: number | null;
  onDismiss: (index: number) => void;
}

export function ProTipsDialog({ tipIndex, onDismiss }: ProTipsDialogProps) {
  if (tipIndex === null || tipIndex < 0 || tipIndex >= TIPS.length) return null;

  const tip = TIPS[tipIndex];

  return (
    <Dialog open onOpenChange={() => onDismiss(tipIndex)}>
      <DialogContent className="max-w-sm sm:max-w-md" hideCloseButton>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Lightbulb className="h-4 w-4 text-primary" />
            Get the most out of Noteshare
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-foreground leading-relaxed">{tip.text}</p>

        {tip.images ? (
          <div className="flex flex-col gap-2">
            {tip.images.map((img, i) => (
              <img
                key={i}
                src={img}
                alt={`Feature screenshot ${i + 1}`}
                className="w-full rounded-lg border border-border"
                loading="eager"
              />
            ))}
          </div>
        ) : (
          <img
            src={tip.image}
            alt="Feature screenshot"
            className="w-full rounded-lg border border-border"
            loading="eager"
          />
        )}

        <Button
          onClick={() => onDismiss(tipIndex)}
          className="w-full"
          size="sm"
        >
          Got it
        </Button>

        <p className="text-[11px] text-muted-foreground text-center">
          You can disable these popups in your profile settings.
        </p>
      </DialogContent>
    </Dialog>
  );
}
