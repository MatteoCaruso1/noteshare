import { Infinity, History, TrendingUp, FolderKanban, Sparkles } from 'lucide-react';
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
    openCheckoutDialog,
    detectedCurrency 
  } = usePremium();

  const handleStartTrial = () => {
    closePremiumDialog();
    openCheckoutDialog();
  };

  const priceDisplay = formatPrice(detectedCurrency);

  return (
    <Dialog open={isPremiumDialogOpen} onOpenChange={closePremiumDialog}>
      <DialogContent 
        className="sm:max-w-md p-0 gap-0 flex flex-col max-h-[90vh]"
        hideCloseButton={false}
        closeButtonClassName="h-6 w-6 top-3 right-3 z-10"
      >
        {/* Body - scrollable */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6 space-y-5">
          {/* Value prop */}
          <p className="text-muted-foreground">
            For less than the price of a latte ☕, Premium helps you stay focused and see real progress
          </p>

          {/* Pricing badge - clickable, full width, gold */}
          <div className="space-y-1">
            <button 
              onClick={handleStartTrial}
              className="w-full flex items-center justify-center bg-jazz-gold hover:bg-jazz-gold/90 text-black transition-colors rounded-full px-4 py-2.5 cursor-pointer"
            >
              <span className="font-medium">30-day free trial, then {priceDisplay}</span>
            </button>
            <p className="text-xs text-muted-foreground italic text-center">Cancel anytime</p>
          </div>

          {/* Benefits */}
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
