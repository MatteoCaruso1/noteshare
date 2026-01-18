import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { 
  EmbeddedCheckoutProvider, 
  EmbeddedCheckout 
} from '@stripe/react-stripe-js';
import { ArrowLeft, Shield, Sparkles, BarChart3, Target, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useEmbeddedCheckout } from '@/hooks/useEmbeddedCheckout';
import { usePremium } from '@/contexts/PremiumContext';
import { formatPrice, PREMIUM_PRICES } from '@/lib/currencyUtils';
import { format, addDays } from 'date-fns';

// Initialize Stripe with publishable key
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

export default function Checkout() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { detectedCurrency } = usePremium();
  const { clientSecret, isLoading, error, initializeCheckout } = useEmbeddedCheckout();
  const [initError, setInitError] = useState<string | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth?redirect=/checkout');
    }
  }, [user, authLoading, navigate]);

  // Initialize checkout session on mount
  useEffect(() => {
    if (user && !clientSecret && !isLoading) {
      initializeCheckout(detectedCurrency).catch((err) => {
        console.error('Failed to initialize checkout:', err);
        setInitError(err.message);
      });
    }
  }, [user, clientSecret, isLoading, detectedCurrency, initializeCheckout]);

  const priceInfo = PREMIUM_PRICES[detectedCurrency];
  const billingDate = format(addDays(new Date(), 30), 'MMMM d, yyyy');

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container max-w-6xl mx-auto px-4 py-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate(-1)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        </div>
      </header>

      {/* Main content */}
      <main className="container max-w-6xl mx-auto px-4 py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12">
          
          {/* Left column - Payment form (60%) */}
          <div className="lg:col-span-3 order-2 lg:order-1">
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">Upgrade to Premium</h1>
                <p className="text-muted-foreground mt-2">
                  Practice smarter. Progress faster.
                </p>
              </div>

              {/* Stripe Embedded Checkout */}
              <div className="bg-card rounded-xl border border-border p-1 min-h-[400px]">
                {isLoading && (
                  <div className="flex items-center justify-center h-[400px]">
                    <div className="text-center space-y-3">
                      <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
                      <p className="text-muted-foreground text-sm">Setting up secure checkout...</p>
                    </div>
                  </div>
                )}

                {(error || initError) && (
                  <div className="flex items-center justify-center h-[400px]">
                    <div className="text-center space-y-4 max-w-sm">
                      <p className="text-destructive">{error || initError}</p>
                      <Button 
                        onClick={() => initializeCheckout(detectedCurrency)}
                        variant="outline"
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
            </div>
          </div>

          {/* Right column - Confirmation details (40%) */}
          <div className="lg:col-span-2 order-1 lg:order-2">
            <div className="lg:sticky lg:top-8 space-y-6">
              
              {/* Plan summary card */}
              <div className="bg-card rounded-xl border border-border p-6 space-y-5">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-jazz-gold/20 to-jazz-gold/5 flex items-center justify-center">
                    <Music className="h-6 w-6 text-jazz-gold" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-lg">Noteshare Premium</h2>
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
                <div className="space-y-3 pt-2 border-t border-border/50">
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

              {/* Benefits */}
              <div className="bg-card/50 rounded-xl border border-border/50 p-5 space-y-4">
                <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">What's included</h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <Target className="h-5 w-5 text-jazz-gold mt-0.5 shrink-0" />
                    <span className="text-sm">Unlimited practice goals to stay focused</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <BarChart3 className="h-5 w-5 text-jazz-gold mt-0.5 shrink-0" />
                    <span className="text-sm">Progress insights across your practice</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Sparkles className="h-5 w-5 text-jazz-gold mt-0.5 shrink-0" />
                    <span className="text-sm">Memory reminders for past breakthroughs</span>
                  </li>
                </ul>
              </div>

              {/* Security badge */}
              <div className="flex items-center justify-center gap-2 text-muted-foreground text-xs">
                <Shield className="h-4 w-4" />
                <span>Secure checkout powered by Stripe</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
