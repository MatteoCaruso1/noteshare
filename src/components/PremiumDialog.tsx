import { Infinity, History, TrendingUp, FolderKanban, Sparkles, ArrowRight } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { usePremium } from '@/contexts/PremiumContext';
import { formatPrice } from '@/lib/currencyUtils';

const BENEFITS = [
  {
    icon: Infinity,
    title: 'Practice without limits',
    description: 'capture as many notes as you want',
  },
  {
    icon: History,
    title: 'Never lose past insights',
    description: 'see your full practice history',
  },
  {
    icon: TrendingUp,
    title: 'Understand your progress',
    description: 'see detailed stats that track your journey',
  },
  {
    icon: FolderKanban,
    title: 'Stay organized long-term',
    description: 'goals, projects, gigs, and archived boards',
  },
];

export function PremiumDialog() {
  const { 
    isPremiumDialogOpen, 
    closePremiumDialog, 
    startCheckout, 
    detectedCurrency 
  } = usePremium();

  const handleStartTrial = async () => {
    closePremiumDialog();
    await startCheckout();
  };

  const priceDisplay = formatPrice(detectedCurrency);

  return (
    <Dialog open={isPremiumDialogOpen} onOpenChange={closePremiumDialog}>
      <DialogContent 
        className="sm:max-w-md p-0 gap-0 flex flex-col max-h-[90vh]"
        hideCloseButton={false}
        closeButtonClassName="h-6 w-6 top-3 right-3 z-10"
      >
        {/* Header */}
        <div className="relative px-6 pt-10 pb-4 shrink-0">
          <h2 className="text-xl font-semibold pr-28">
            Practice smarter.<br />Progress faster.
          </h2>
          <Button 
            size="sm" 
            variant="hero" 
            onClick={handleStartTrial}
            className="absolute right-3 top-14 gap-1"
          >
            Start Free Trial
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Body - scrollable */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-6 space-y-5">
          {/* Value prop */}
          <p className="text-muted-foreground">
            For the price of a latte ☕ each month, Premium helps you stay focused and see real progress.
          </p>

          {/* Pricing badge - clickable */}
          <button 
            onClick={handleStartTrial}
            className="inline-flex items-center gap-1.5 bg-muted/50 hover:bg-muted/70 transition-colors rounded-full px-4 py-2 cursor-pointer"
          >
            <span className="font-medium">{priceDisplay} with</span>
            <span className="font-medium text-jazz-gold">30-day free trial</span>
          </button>

          {/* Benefits */}
          <div className="space-y-4 pt-2">
            <p className="text-sm font-medium text-muted-foreground">With Premium, you can:</p>
            
            <div className="space-y-3">
              {BENEFITS.map((benefit) => (
                <div key={benefit.title} className="flex items-start gap-3">
                  <div className="shrink-0 mt-0.5">
                    <benefit.icon className="h-4 w-4 text-jazz-gold" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{benefit.title}</p>
                    <p className="text-xs text-muted-foreground">{benefit.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer CTA */}
          <Button 
            size="lg" 
            variant="hero" 
            onClick={handleStartTrial}
            className="w-full gap-2"
          >
            <Sparkles className="h-4 w-4" />
            Start Free Trial
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
