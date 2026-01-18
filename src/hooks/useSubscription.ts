import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { PREMIUM_PRICES, SupportedCurrency } from '@/lib/currencyUtils';

// Product/Price mapping for Noteshare Premium
export const SUBSCRIPTION_TIERS = {
  premium: {
    product_id: "prod_ToONzcZjkyqsAJ",
    prices: PREMIUM_PRICES,
    name: "Premium",
  }
} as const;

interface SubscriptionState {
  subscribed: boolean;
  productId: string | null;
  subscriptionEnd: string | null;
  isLoading: boolean;
  hasCheckedOnce: boolean;
  error: string | null;
}

export function useSubscription() {
  const { user } = useAuth();
  const [state, setState] = useState<SubscriptionState>({
    subscribed: false,
    productId: null,
    subscriptionEnd: null,
    isLoading: true, // Start with loading true for initial check
    hasCheckedOnce: false,
    error: null,
  });

  const checkSubscription = useCallback(async () => {
    if (!user) {
      setState({
        subscribed: false,
        productId: null,
        subscriptionEnd: null,
        isLoading: false,
        hasCheckedOnce: true,
        error: null,
      });
      return;
    }

    // Only show loading state on initial check, not on refreshes
    // This prevents the premium gate from flickering during periodic checks
    setState(prev => {
      if (!prev.hasCheckedOnce) {
        return { ...prev, isLoading: true, error: null };
      }
      // For refreshes, don't set isLoading - just clear errors silently
      return { ...prev, error: null };
    });

    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');

      if (error) throw error;

      setState({
        subscribed: data.subscribed || false,
        productId: data.product_id || null,
        subscriptionEnd: data.subscription_end || null,
        isLoading: false,
        hasCheckedOnce: true,
        error: null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Error checking subscription:', err);

      // If auth token is stale/expired, try a silent refresh once, then fall back to "not subscribed"
      if (message.includes('Auth session missing')) {
        try {
          await supabase.auth.refreshSession();
          const { data, error } = await supabase.functions.invoke('check-subscription');
          if (!error) {
            setState({
              subscribed: data?.subscribed || false,
              productId: data?.product_id || null,
              subscriptionEnd: data?.subscription_end || null,
              isLoading: false,
              hasCheckedOnce: true,
              error: null,
            });
            return;
          }
        } catch (refreshErr) {
          console.warn('Subscription check: session refresh failed', refreshErr);
        }

        setState({
          subscribed: false,
          productId: null,
          subscriptionEnd: null,
          isLoading: false,
          hasCheckedOnce: true,
          error: null,
        });
        return;
      }

      setState(prev => ({
        ...prev,
        isLoading: false,
        hasCheckedOnce: true, // Mark as checked even on error
        error: message || 'Failed to check subscription',
      }));
    }
  }, [user]);

  // Check subscription on mount and when user changes
  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  // Refresh subscription status periodically (every minute)
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(checkSubscription, 60000);
    return () => clearInterval(interval);
  }, [user, checkSubscription]);

  const startCheckout = async (currency: SupportedCurrency = 'USD') => {
    if (!user) {
      throw new Error('Must be logged in to subscribe');
    }

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { currency }
      });
      
      if (error) throw error;
      if (!data?.url) throw new Error('No checkout URL returned');

      // Open Stripe checkout in new tab
      window.open(data.url, '_blank');
    } catch (err) {
      console.error('Error starting checkout:', err);
      throw err;
    }
  };

  const openCustomerPortal = async () => {
    if (!user) {
      throw new Error('Must be logged in to manage subscription');
    }

    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      
      if (error) throw error;
      if (!data?.url) throw new Error('No portal URL returned');

      // Open Stripe portal in new tab
      window.open(data.url, '_blank');
    } catch (err) {
      console.error('Error opening customer portal:', err);
      throw err;
    }
  };

  // Check against the premium product ID (supports both old and new products)
  const isPremium = state.subscribed && (
    state.productId === SUBSCRIPTION_TIERS.premium.product_id ||
    state.productId === 'prod_TofQhqCDH1KicB' || // USD product
    state.productId === 'prod_TofQx0QRLi6tEe'    // CAD product
  );

  return {
    ...state,
    isPremium,
    checkSubscription,
    startCheckout,
    openCustomerPortal,
  };
}
