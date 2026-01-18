import { useEffect, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { 
  EmbeddedCheckoutProvider, 
  EmbeddedCheckout 
} from '@stripe/react-stripe-js';
import { Shield, Sparkles, Music } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useEmbeddedCheckout } from '@/hooks/useEmbeddedCheckout';
import { usePremium } from '@/contexts/PremiumContext';
import { formatPrice, PREMIUM_PRICES } from '@/lib/currencyUtils';
import { format, addDays } from 'date-fns';

// Initialize Stripe with publishable key
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

interface CheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CheckoutDialog({ open, onOpenChange }: CheckoutDialogProps) {
  const { user } = useAuth();
  const { detectedCurrency } = usePremium();
  const { clientSecret, isLoading, error, initializeCheckout, resetCheckout } = useEmbeddedCheckout();
  const [initError, setInitError] = useState<string | null>(null);

  // Initialize checkout session when dialog opens
  useEffect(() => {
    if (open && user && !clientSecret && !isLoading) {
      initializeCheckout(detectedCurrency).catch((err) => {
        console.error('Failed to initialize checkout:', err);
        setInitError(err.message);
      });
    }
  }, [open, user, clientSecret, isLoading, detectedCurrency, initializeCheckout]);

  // Reset checkout state when dialog closes
  useEffect(() => {
    if (!open) {
      setInitError(null);
      resetCheckout();
    }
  }, [open, resetCheckout]);

  const priceInfo = PREMIUM_PRICES[detectedCurrency];
  const billingDate = format(addDays(new Date(), 30), 'MMMM d, yyyy');

  if (!user) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-4xl p-0 gap-0 max-h-[90vh] overflow-hidden"
        hideCloseButton={false}
      >
        <div className="grid grid-cols-1 md:grid-cols-5 max-h-[90vh]">
          {/* Left column - Payment form (60%) */}
          <div className="md:col-span-3 p-6 overflow-y-auto order-2 md:order-1 border-t md:border-t-0 md:border-r border-border/50">
            <div className="space-y-4">
              <div>
                <h1 className="text-xl font-bold">Upgrade to Premium</h1>
                <p className="text-muted-foreground text-sm mt-1">
                  Practice smarter. Progress faster.
                </p>
              </div>

              {/* Stripe Embedded Checkout */}
              <div className="bg-card rounded-lg border border-border/50 p-1 min-h-[350px]">
                {isLoading && (
                  <div className="flex items-center justify-center h-[350px]">
                    <div className="text-center space-y-3">
                      <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto" />
                      <p className="text-muted-foreground text-sm">Setting up secure checkout...</p>
                    </div>
                  </div>
                )}

                {(error || initError) && (
                  <div className="flex items-center justify-center h-[350px]">
                    <div className="text-center space-y-4 max-w-sm">
                      <p className="text-destructive text-sm">{error || initError}</p>
                      <Button 
                        onClick={() => initializeCheckout(detectedCurrency)}
                        variant="outline"
                        size="sm"
                      >
                        Try Again
                      </Button>
                    </div>
                  </div>
                )}

                {clientSecret && (
                  <EmbeddedCheckoutProvider
                    stripe={stripePromise}
                    options={{ clientSecret }}
                  >
                    <EmbeddedCheckout className="checkout-form" />
                  </EmbeddedCheckoutProvider>
                )}
              </div>

              {/* Security badge */}
              <div className="flex items-center justify-center gap-2 text-muted-foreground text-xs pt-2">
                <Shield className="h-3.5 w-3.5" />
                <span>Secure checkout powered by Stripe</span>
              </div>
            </div>
          </div>

          {/* Right column - Confirmation details (40%) */}
          <div className="md:col-span-2 p-6 bg-muted/30 order-1 md:order-2">
            <div className="space-y-5">
              {/* Plan summary */}
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-jazz-gold/20 to-jazz-gold/5 flex items-center justify-center">
                  <Music className="h-5 w-5 text-jazz-gold" />
                </div>
                <div>
                  <h2 className="font-semibold">Noteshare Premium</h2>
                  <p className="text-muted-foreground text-sm">{formatPrice(detectedCurrency)}</p>
                </div>
              </div>

              {/* Trial highlight */}
              <div className="bg-jazz-gold/10 border border-jazz-gold/20 rounded-lg px-4 py-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-jazz-gold" />
                  <span className="font-medium text-jazz-gold">30-day free trial</span>
                </div>
              </div>

              {/* Billing info */}
              <div className="space-y-2 pt-2 border-t border-border/50">
                <p className="text-sm text-muted-foreground">
                  Your card will be charged <span className="font-medium text-foreground">{priceInfo.label}</span> on <span className="font-medium text-foreground">{billingDate}</span>.
                </p>
                <p className="text-sm text-muted-foreground italic">
                  Cancel anytime through your Profile page.
                </p>
              </div>

              {/* Total */}
              <div className="pt-4 border-t border-border">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total due today</span>
                  <span className="text-xl font-bold text-jazz-gold">$0.00</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
