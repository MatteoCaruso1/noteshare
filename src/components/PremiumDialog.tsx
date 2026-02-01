import { useState } from 'react';
import { Timer, BarChart3, FolderKanban, Heart, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { usePremium } from '@/contexts/PremiumContext';
import { toast } from 'sonner';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const BENEFITS = [
  {
    icon: Timer,
    title: 'Premium Practice Tools',
    description: 'Use metronomes, practice timers, linking to goals, and save practice boards, all within your sessions',
  },
  {
    icon: BarChart3,
    title: 'Pro Statistics',
    description: 'Unlock detailed stats and dynamic goals that measure your progress',
  },
  {
    icon: FolderKanban,
    title: 'Musical Pursuits',
    description: 'Organize your notes around goals, projects, gigs, and archived practice boards',
  },
  {
    icon: Heart,
    title: 'Support Noteshare Development',
    description: 'I created Noteshare to improve the way my friends and I practice and connect. I really appreciate your support!',
  },
  {
    icon: Sparkles,
    title: 'Consistent Premium Feature Drops',
    description: 'I am constantly working on new Premium features to make Noteshare the ultimate tool for musicians',
  },
];

export function PremiumDialog() {
  const { 
    isPremiumDialogOpen, 
    closePremiumDialog, 
    openCheckoutDialog,
    startLifetimeCheckout,
  } = usePremium();
  
  const [isLifetimeLoading, setIsLifetimeLoading] = useState(false);
  const [isPricingOpen, setIsPricingOpen] = useState(false);

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

  return (
    <Dialog open={isPremiumDialogOpen} onOpenChange={closePremiumDialog}>
      <DialogContent 
        className="sm:max-w-md p-0 gap-0 flex flex-col max-h-[90vh]"
        hideCloseButton={false}
        closeButtonClassName="h-6 w-6 top-3 right-3 z-10"
      >
        {/* Body - scrollable */}
        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6 pb-28 space-y-5">
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
                  My name is <span className="text-foreground">Matteo</span>, a pianist and independent developer of Noteshare. Your contributions make it possible for me to keep improving Noteshare. Thank you for your support!
                </p>
                <p>
                  All I want is to build a great tool for musicians like me, so I've priced the product as cheaply as possible. Subscription or lifetime purchases both help me manage the development costs associated with my passion project.
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

        {/* Fixed CTA Buttons with fade */}
        <div className="absolute bottom-0 left-0 right-0">
          {/* Fade gradient */}
          <div className="h-8 bg-gradient-to-t from-background to-transparent pointer-events-none" />
          {/* Buttons */}
          <div className="flex gap-3 px-6 pb-6 pt-2 bg-background">
            <Button 
              onClick={handleStartTrial}
              className="flex-1 bg-jazz-amber hover:bg-jazz-amber/90 text-jazz-midnight text-xs px-2 py-5 h-auto whitespace-normal text-center font-medium"
            >
              <span><span className="font-semibold">7 days free,</span> then $2.49/mo</span>
            </Button>
            <Button 
              onClick={handleLifetimePurchase}
              disabled={isLifetimeLoading}
              variant="outline"
              className="flex-1 border-jazz-amber text-jazz-amber hover:bg-jazz-amber/10 text-xs px-2 py-5 h-auto whitespace-normal text-center"
            >
              <span><span className="font-semibold">Lifetime access</span> for $9.99</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
