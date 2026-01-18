import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePremium } from '@/contexts/PremiumContext';

interface DailyLimitBannerProps {
  notesPostedToday: number;
  dailyLimit: number;
}

export function DailyLimitBanner({ notesPostedToday, dailyLimit }: DailyLimitBannerProps) {
  const { startCheckout } = usePremium();

  return (
    <div className="flex flex-col items-center gap-3 p-4 bg-muted/50 rounded-lg border border-border text-center">
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
        <Sparkles className="h-5 w-5 text-primary" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">
          Daily note limit reached
        </p>
        <p className="text-xs text-muted-foreground">
          You've posted {notesPostedToday}/{dailyLimit} note{dailyLimit === 1 ? '' : 's'} today. 
          Upgrade to Premium for unlimited notes.
        </p>
      </div>
      <Button 
        size="sm" 
        onClick={startCheckout}
        variant="hero"
        className="gap-1.5"
      >
        <Sparkles className="h-3.5 w-3.5" />
        Upgrade to Premium
      </Button>
    </div>
  );
}
