import { CreditCard, Mail, Crown } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePremium } from '@/contexts/PremiumContext';
import { useSubscription } from '@/hooks/useSubscription';
import { format } from 'date-fns';

export function ManagePlansSection() {
  const { isPremium, openCheckoutDialog } = usePremium();
  const { subscriptionEnd, openCustomerPortal, isLoading } = useSubscription();

  const handleSwitchPlan = async () => {
    if (isPremium) {
      // Premium user wants to downgrade - open Stripe portal
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
        <div className="flex items-center justify-center p-3 rounded-lg bg-muted/50 border border-border/50">
          {isPremium && (
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mr-3">
              <Crown className="w-5 h-5 text-primary" />
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {isPremium ? 'Noteshare Premium' : 'Noteshare Free'}
            </span>
            <Badge 
              variant={isPremium ? 'default' : 'secondary'}
              className="text-xs"
            >
              {isPremium ? 'Active' : 'Current'}
            </Badge>
          </div>
          {isPremium && subscriptionEnd && (
            <p className="text-xs text-muted-foreground ml-2">
              · Access until {formatSubscriptionEnd()}
            </p>
          )}
        </div>

        {/* Switch Plan Button */}
        <Button 
          onClick={handleSwitchPlan}
          variant={isPremium ? 'outline' : 'hero'}
          className="w-full"
          disabled={isLoading}
        >
          {isPremium ? 'Switch to Free' : 'Upgrade to Premium'}
        </Button>

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
