import { useEffect, useState, useMemo } from 'react';
import { loadStripe, Stripe } from '@stripe/stripe-js';
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

// Stripe publishable key - this is a public key, safe to include
const STRIPE_PUBLISHABLE_KEY = 'pk_live_51RXGXkRovvYuNPKsGqJzP1LOGzTPJqEUZgGfWWdqHBkblwtpwqkJnuDL7OhnFGLLpJTQaUqJthxkKHDTBqZt7eUN00dFCrJoKt';

// Lazily initialize Stripe only when needed
let stripePromise: Promise<Stripe | null> | null = null;
const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY);
  }
  return stripePromise;
};

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
        className="sm:max-w-lg p-6 gap-0 max-h-[90vh] overflow-y-auto"
        hideCloseButton={false}
      >
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
                stripe={getStripe()}
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
      </DialogContent>
    </Dialog>
  );
}
