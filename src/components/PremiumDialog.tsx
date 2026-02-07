import { useState } from 'react';
import { Timer, BarChart3, FolderKanban, Heart, Sparkles, ChevronDown, ChevronUp, Palette } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { usePremium } from '@/contexts/PremiumContext';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const BENEFITS = [
  {
    icon: Timer,
    title: 'Pro Practice Tools',
    description: 'Use metronomes, practice timers, linking to goals, logging past sessions, and saving practice boards, all within your sessions',
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
  } = usePremium();
  
  const [isPricingOpen, setIsPricingOpen] = useState(false);

  const handleStartTrial = () => {
    closePremiumDialog();
    openCheckoutDialog();
  };

  const handleLifetimePurchase = () => {
    closePremiumDialog();
    openLifetimeCheckoutDialog();
  };

  return (
    <Dialog open={isPremiumDialogOpen} onOpenChange={closePremiumDialog}>
      <DialogContent 
        className="sm:max-w-md p-0 gap-0 flex flex-col max-h-[90vh]"
        hideCloseButton={false}
        closeButtonClassName="h-6 w-6 top-3 right-3 z-10"
      >
        {/* Body - scrollable */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-6 py-6 pb-32 space-y-5">
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

        {/* Fixed CTA Buttons with fade */}
        <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
          {/* Fade gradient - smoother transition */}
          <div className="h-16 bg-gradient-to-t from-background via-background/80 to-transparent" />
          {/* Buttons container */}
          <div className="flex gap-3 px-6 pb-6 pt-2 bg-background pointer-events-auto">
            <button
              type="button"
              onClick={handleStartTrial}
              className="flex-1 rounded-md text-sm px-2 py-3 h-auto whitespace-normal text-center font-bold touch-manipulation transition-colors duration-200 active:scale-[0.98] [-webkit-tap-highlight-color:transparent] bg-jazz-amber text-jazz-midnight [@media(hover:hover)]:hover:bg-jazz-amber/90 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-jazz-amber focus-visible:outline-offset-2"
            >
              <span>
                <span className="font-bold">7 days free,</span> then $1.99/mo
              </span>
            </button>
            <button
              type="button"
              onClick={handleLifetimePurchase}
              className="flex-1 rounded-md text-sm px-2 py-3 h-auto whitespace-normal text-center font-bold touch-manipulation transition-colors duration-200 active:scale-[0.98] [-webkit-tap-highlight-color:transparent] border-2 border-jazz-amber text-jazz-amber bg-transparent [@media(hover:hover)]:hover:bg-jazz-amber/10 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-jazz-amber focus-visible:outline-offset-2"
            >
              <span>
                <span className="font-bold">Lifetime access</span> for $9.99
              </span>
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
