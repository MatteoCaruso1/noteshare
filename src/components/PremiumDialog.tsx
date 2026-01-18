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
  const altCurrency = detectedCurrency === 'CAD' ? 'USD' : 'CAD';
  const altPrice = formatPrice(altCurrency);

  return (
    <Dialog open={isPremiumDialogOpen} onOpenChange={closePremiumDialog}>
      <DialogContent 
        className="sm:max-w-md p-0 gap-0 overflow-hidden"
        hideCloseButton={false}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <h2 className="text-xl font-semibold">Practice smarter. Progress faster.</h2>
          <Button 
            size="sm" 
            variant="hero" 
            onClick={handleStartTrial}
            className="gap-1 shrink-0"
          >
            Start Free Trial
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Body */}
        <div className="px-6 pb-6 space-y-5">
          {/* Value prop */}
          <p className="text-muted-foreground">
            For the price of a latte ☕ each month, Premium helps you stay focused and see real progress.
          </p>

          {/* Pricing badge */}
          <div className="inline-flex items-center gap-2 bg-muted/50 rounded-full px-4 py-2">
            <span className="font-medium">{priceDisplay}</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-jazz-gold font-medium">30-day free trial</span>
          </div>

          {/* Alt currency note */}
          <p className="text-xs text-muted-foreground">
            {detectedCurrency === 'CAD' 
              ? `Pricing for Canada. US & other regions: ${altPrice}`
              : `Pricing for US & other regions. Canada: ${altPrice}`
            }
          </p>

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
