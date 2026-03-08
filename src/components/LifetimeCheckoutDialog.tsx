import { useEffect, useState, useCallback } from 'react';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { 
  EmbeddedCheckoutProvider, 
  EmbeddedCheckout 
} from '@stripe/react-stripe-js';
import { Shield } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useLifetimeCheckout } from '@/hooks/useLifetimeCheckout';
import { usePremium } from '@/contexts/PremiumContext';
import { getPrices } from '@/lib/currencyUtils';
import { supabase } from '@/integrations/supabase/client';

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

interface LifetimeCheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LifetimeCheckoutDialog({ open, onOpenChange }: LifetimeCheckoutDialogProps) {
  const { user } = useAuth();
  const { detectedCurrency, checkSubscription } = usePremium();
  const { clientSecret, sessionId, isLoading, error, initializeCheckout, resetCheckout } = useLifetimeCheckout();
  const [initError, setInitError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Initialize checkout session when dialog opens
  useEffect(() => {
    if (open && user && !clientSecret && !isLoading) {
      initializeCheckout(detectedCurrency).catch((err) => {
        console.error('Failed to initialize lifetime checkout:', err);
        setInitError(err.message);
      });
    }
  }, [open, user, clientSecret, isLoading, detectedCurrency, initializeCheckout]);

  // Reset checkout state when dialog closes
  useEffect(() => {
    if (!open) {
      setInitError(null);
      setIsVerifying(false);
      setShowSuccess(false);
      resetCheckout();
    }
  }, [open, resetCheckout]);

  // Handle in-dialog checkout completion (no page redirect)
  const handleComplete = useCallback(async () => {
    setIsVerifying(true);
    try {
      if (sessionId) {
        await supabase.functions.invoke('verify-purchase', {
          body: { session_id: sessionId },
        });
      }
      await checkSubscription();
      setShowSuccess(true);
    } catch (err) {
      console.warn('Post-checkout verification error:', err);
      await checkSubscription();
      setShowSuccess(true);
    } finally {
      setIsVerifying(false);
    }
  }, [sessionId, checkSubscription]);

  const priceInfo = getPrices(detectedCurrency).lifetime;

  if (!user) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={showSuccess ? () => onOpenChange(false) : onOpenChange}>
      <DialogContent 
        className="sm:max-w-lg p-6 pt-12 gap-0 max-h-[90vh] overflow-y-auto"
        hideCloseButton={false}
        closeButtonClassName="h-6 w-6 right-3 top-3"
      >
        <div className="space-y-4">
          {showSuccess ? (
            // In-dialog success state
            <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-3xl">🎉</span>
              </div>
              <h2 className="text-xl font-bold">Welcome to Pro!</h2>
              <p className="text-muted-foreground">
                You have lifetime Pro access. Enjoy all Pro features forever!
              </p>
              <Button onClick={() => onOpenChange(false)} className="mt-2">
                Let's Go!
              </Button>
            </div>
          ) : isVerifying ? (
            // Verifying payment state
            <div className="flex items-center justify-center h-[350px]">
              <div className="text-center space-y-3">
                <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto" />
                <p className="text-muted-foreground text-sm">Activating your Pro access...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="text-center space-y-1">
                <h2 className="text-lg font-bold">Lifetime Access</h2>
                <p className="text-sm text-muted-foreground">
                  One-time payment of {priceInfo.label} for permanent access
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
                    options={{ clientSecret, onComplete: handleComplete }}
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
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}