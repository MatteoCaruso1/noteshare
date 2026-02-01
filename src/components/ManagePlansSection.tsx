import { CreditCard, Mail, Crown, Infinity } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePremium } from '@/contexts/PremiumContext';
import { useSubscription } from '@/hooks/useSubscription';
import { format } from 'date-fns';

export function ManagePlansSection() {
  const { isPremium, openCheckoutDialog } = usePremium();
  const { subscriptionEnd, isLifetime, openCustomerPortal, isLoading } = useSubscription();

  const handleSwitchPlan = async () => {
    if (isPremium) {
      // Lifetime users shouldn't see this button, but guard anyway
      if (isLifetime) return;
      
      // Premium subscriber wants to manage - open Stripe portal
      try {
        await openCustomerPortal();
      } catch (error) {
        console.error('Failed to open customer portal:', error);
      }
    } else {
      // Free user wants to upgrade - open checkout dialog
      openCheckoutDialog();
    }
  };

  const formatSubscriptionEnd = () => {
    if (!subscriptionEnd) return null;
    try {
      return format(new Date(subscriptionEnd), 'MMMM d, yyyy');
    } catch {
      return null;
    }
  };

  return (
    <Card className="p-4 bg-card border-border">
      <div className="flex items-center gap-2 mb-4">
        <CreditCard className="w-5 h-5 text-primary" />
        <h3 className="font-medium">Manage Plans</h3>
      </div>

      <div className="space-y-4">
        {/* Current Plan Display */}
        <div className={`flex items-center justify-center h-11 px-4 rounded-lg border ${
          isPremium 
            ? 'bg-amber-500/10 border-amber-500/30' 
            : 'bg-muted/50 border-border/50'
        }`}>
          {isPremium && (
            <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center mr-3">
              {isLifetime ? (
                <Infinity className="w-4 h-4 text-amber-500" />
              ) : (
                <Crown className="w-4 h-4 text-amber-500" />
              )}
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${isPremium ? 'text-amber-500' : ''}`}>
              {isPremium ? 'Noteshare Pro' : 'Noteshare'}
            </span>
            <Badge 
              variant="secondary"
              className={`text-xs ${isPremium ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' : ''}`}
            >
              {isLifetime ? 'Lifetime' : isPremium ? 'Active' : 'Current'}
            </Badge>
          </div>
          {isPremium && !isLifetime && subscriptionEnd && (
            <p className="text-xs text-amber-500/70 ml-2">
              · Access until {formatSubscriptionEnd()}
            </p>
          )}
        </div>

        {/* Switch Plan Button - Hidden for lifetime users */}
        {!isLifetime && (
          <Button 
            onClick={handleSwitchPlan}
            variant={isPremium ? 'outline' : 'hero'}
            className={`w-full ${isPremium ? 'opacity-50 hover:opacity-70' : ''}`}
            disabled={isLoading}
          >
            {isPremium ? 'Manage Subscription' : 'Upgrade to Pro'}
          </Button>
        )}

        {/* Lifetime confirmation message */}
        {isLifetime && (
          <p className="text-center text-sm text-amber-500/80">
            You have lifetime access to Noteshare Pro ✨
          </p>
        )}

        {/* Help Email */}
        <div className="flex items-center justify-center gap-2 pt-2 border-t border-border/50">
          <Mail className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Contact for help:{' '}
            <a 
              href="mailto:matteo.m.caruso1@gmail.com" 
              className="text-primary hover:underline"
            >
              matteo.m.caruso1@gmail.com
            </a>
          </span>
        </div>
      </div>
    </Card>
  );
}
