import { useState } from 'react';
import { Timer, BarChart3, ClipboardList, Heart, Sparkles, ChevronDown, ChevronUp, Palette, RotateCcw, Loader2 } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { usePremium } from '@/contexts/PremiumContext';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useApplePurchases, APPLE_PRODUCT_IDS } from '@/hooks/useApplePurchases';
import { isNativeIOS } from '@/lib/platformUtils';
import { toast } from 'sonner';

const BENEFITS = [
  {
    icon: Timer,
    title: 'Pro Practice Tools',
    description: 'Log past sessions, use metronomes and practice timers, save practice routines, link notes to goals, and more',
  },
  {
    icon: BarChart3,
    title: 'Pro Statistics',
    description: 'Unlock detailed stats that measure your progress',
  },
  {
    icon: ClipboardList,
    title: "Unlock 'Organize'",
    description: 'Organize your notes around goals, folders, and gigs; manage all your musical pursuits, on Noteshare',
  },
  {
    icon: Palette,
    title: 'Custom Themes',
    description: 'Personalize Noteshare with custom color themes',
  },
  {
    icon: Heart,
    title: 'Support Noteshare Development',
    description: 'I created Noteshare to improve the way my friends and I practice and connect. I really appreciate your support!',
  },
  {
    icon: Sparkles,
    title: 'Consistent Feature Drops',
    description: 'I am constantly working on new Pro features to make Noteshare the ultimate tool for musicians',
  },
];

export function PremiumDialog() {
  const { 
    isPremiumDialogOpen, 
    closePremiumDialog, 
    openCheckoutDialog,
    openLifetimeCheckoutDialog,
    checkSubscription,
  } = usePremium();
  
  const [isPricingOpen, setIsPricingOpen] = useState(false);
  const applePurchases = useApplePurchases();
  const onIOS = isNativeIOS();

  const handleStartTrial = async () => {
    if (onIOS) {
      // Use Apple IAP on iOS
      const success = await applePurchases.purchaseProduct(APPLE_PRODUCT_IDS.monthly);
      if (success) {
        await checkSubscription();
        closePremiumDialog();
        toast.success('Welcome to Noteshare Pro!');
      }
    } else {
      closePremiumDialog();
      openCheckoutDialog();
    }
  };

  const handleLifetimePurchase = async () => {
    if (onIOS) {
      const success = await applePurchases.purchaseProduct(APPLE_PRODUCT_IDS.lifetime);
      if (success) {
        await checkSubscription();
        closePremiumDialog();
        toast.success('Lifetime access activated!');
      }
    } else {
      closePremiumDialog();
      openLifetimeCheckoutDialog();
    }
  };

  const handleRestore = async () => {
    const restored = await applePurchases.restorePurchases();
    if (restored) {
      await checkSubscription();
      closePremiumDialog();
      toast.success('Purchases restored!');
    } else {
      toast.error('No purchases found to restore.');
    }
  };

  const isPurchasing = applePurchases.isPurchasing || applePurchases.isRestoring;

  return (
    <Dialog open={isPremiumDialogOpen} onOpenChange={closePremiumDialog}>
      <DialogContent 
        className="sm:max-w-md p-0 gap-0 flex flex-col max-h-[90vh] overflow-hidden"
        hideCloseButton={false}
        closeButtonClassName="h-6 w-6 top-3 right-3 z-10"
      >
        {/* Body - scrollable */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-6 py-6 pb-4 space-y-5">
          {/* Header */}
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-jazz-amber">Noteshare Pro</h2>
            <p className="text-muted-foreground text-sm">
              Get more features and support indie development
            </p>
          </div>

          {/* About Pricing Collapsible */}
          <Collapsible open={isPricingOpen} onOpenChange={setIsPricingOpen}>
            <div className="flex justify-center">
              <CollapsibleTrigger asChild>
                <button className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-muted/50 text-foreground text-sm font-medium hover:bg-muted transition-colors">
                  About pricing
                  {isPricingOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent className="mt-4">
              <div className="text-sm text-muted-foreground leading-relaxed space-y-3 text-center px-2">
                <p>
                  My name is <span className="text-foreground">Matteo</span>, a pianist and independent developer. Your contributions make it possible for me to keep improving Noteshare. Thank you for your support!
                </p>
                <p>
                  My objective is to build the ultimate tool for musicians, so I've attempted to price the product as reasonably as possible. Subscription or lifetime purchases both help me manage the development costs of my passion project.
                </p>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Benefits */}
          <div className="space-y-4 pt-2">
            {BENEFITS.map((benefit, index) => (
              <div 
                key={benefit.title} 
                className={`flex items-start gap-3 pb-4 ${index < BENEFITS.length - 1 ? 'border-b border-border/50' : ''}`}
              >
                <div className="shrink-0 mt-0.5">
                  <benefit.icon className="h-5 w-5 text-jazz-amber" />
                </div>
                <div>
                  <p className="font-medium text-sm text-jazz-amber">{benefit.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{benefit.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Buttons - non-overlapping */}
        <div className="shrink-0">
          <div className="flex gap-3 px-6 pb-4 pt-3">
            <button
              type="button"
              onClick={handleStartTrial}
              disabled={isPurchasing}
              className="flex-1 rounded-md text-sm px-2 py-3 h-auto whitespace-normal text-center font-bold touch-manipulation transition-colors duration-200 active:scale-[0.98] [-webkit-tap-highlight-color:transparent] bg-jazz-amber text-jazz-midnight [@media(hover:hover)]:hover:bg-jazz-amber/90 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-jazz-amber focus-visible:outline-offset-2 disabled:opacity-50"
            >
              {isPurchasing ? (
                <Loader2 className="h-4 w-4 animate-spin mx-auto" />
              ) : (
                <span>
                  {onIOS
                    ? applePurchases.products.find(p => p.id === APPLE_PRODUCT_IDS.monthly)
                      ? `${applePurchases.products.find(p => p.id === APPLE_PRODUCT_IDS.monthly)!.price}/mo`
                      : '$2.99/mo'
                    : <><span className="font-bold">7 days free,</span> then $2.99/mo</>
                  }
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={handleLifetimePurchase}
              disabled={isPurchasing}
              className="flex-1 rounded-md text-sm px-2 py-3 h-auto whitespace-normal text-center font-bold touch-manipulation transition-colors duration-200 active:scale-[0.98] [-webkit-tap-highlight-color:transparent] border-2 border-jazz-amber text-jazz-amber bg-transparent [@media(hover:hover)]:hover:bg-jazz-amber/10 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-jazz-amber focus-visible:outline-offset-2 disabled:opacity-50"
            >
              {isPurchasing ? (
                <Loader2 className="h-4 w-4 animate-spin mx-auto" />
              ) : (
                <span>
                  <span className="font-bold">Lifetime</span>{' '}
                  {onIOS
                    ? applePurchases.products.find(p => p.id === APPLE_PRODUCT_IDS.lifetime)?.price || '$14.99'
                    : '$14.99'
                  }
                </span>
              )}
            </button>
          </div>
          {/* Restore Purchases button — iOS only */}
          {onIOS && (
            <div className="px-6 pb-6">
              <button
                type="button"
                onClick={handleRestore}
                disabled={isPurchasing}
                className="w-full flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-2 disabled:opacity-50"
              >
                <RotateCcw className="h-3 w-3" />
                Restore Purchases
              </button>
            </div>
          )}
          {applePurchases.error && (
            <p className="text-xs text-destructive text-center px-6 pb-4">{applePurchases.error}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
