import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePremium } from '@/contexts/PremiumContext';

interface DailyLimitBannerProps {
  notesPostedToday: number;
  dailyLimit: number;
}

export function DailyLimitBanner({ notesPostedToday, dailyLimit }: DailyLimitBannerProps) {
  const { openPremiumDialog } = usePremium();

  return (
    <div className="flex flex-col items-center gap-2 p-3 bg-muted/50 rounded-lg border border-border text-center">
      <div className="space-y-0.5">
        <p className="text-sm font-medium text-jazz-gold">
          Daily note limit reached
        </p>
        <p className="text-xs text-muted-foreground">
          Lite users can post one note per day. Try Premium for Free for unlimited notes.
        </p>
      </div>
      <Button 
        size="sm" 
        onClick={openPremiumDialog}
        variant="hero"
        className="gap-1.5"
      >
        <Sparkles className="h-3.5 w-3.5" />
        Try Premium for Free
      </Button>
    </div>
  );
}
