import { useState } from 'react';
import { Infinity, History, TrendingUp, FolderKanban, Sparkles, Crown } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { usePremium } from '@/contexts/PremiumContext';
import { formatPrice } from '@/lib/currencyUtils';
import { toast } from 'sonner';

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
    startLifetimeCheckout,
    detectedCurrency 
  } = usePremium();
  
  const [isLifetimeLoading, setIsLifetimeLoading] = useState(false);

  const handleStartTrial = () => {
    closePremiumDialog();
    openCheckoutDialog();
  };

  const handleLifetimePurchase = async () => {
    setIsLifetimeLoading(true);
    try {
      await startLifetimeCheckout();
      closePremiumDialog();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start checkout';
      toast.error(message);
    } finally {
      setIsLifetimeLoading(false);
    }
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
          <p className="text-muted-foreground pr-6">
            For less than a latte ☕, Premium helps you stay focused and see real progress
          </p>

          {/* Pricing badge - clickable, full width, gold */}
          <div className="space-y-1">
            <button 
              onClick={handleStartTrial}
              className="w-full flex items-center justify-center bg-gradient-to-r from-jazz-gold to-jazz-amber text-jazz-midnight transition-all rounded-full px-4 py-2.5 cursor-pointer shadow-lg [@media(hover:hover)]:hover:shadow-xl [@media(hover:hover)]:hover:scale-[1.02] active:scale-[0.98]"
            >
              <span><span className="font-semibold">30-day free trial,</span> then {priceDisplay}</span>
            </button>
            <p className="text-xs text-muted-foreground italic text-center">Cancel anytime</p>
          </div>

          {/* Lifetime purchase option */}
          <div className="space-y-1">
            <button 
              onClick={handleLifetimePurchase}
              disabled={isLifetimeLoading}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground transition-all rounded-full px-4 py-2.5 cursor-pointer shadow-lg [@media(hover:hover)]:hover:shadow-xl [@media(hover:hover)]:hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Crown className="h-4 w-4" />
              <span><span className="font-semibold">Lifetime access</span> for $19.99</span>
            </button>
            <p className="text-xs text-muted-foreground italic text-center">One-time payment, forever yours</p>
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
