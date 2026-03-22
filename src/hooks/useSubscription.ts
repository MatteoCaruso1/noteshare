import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { PREMIUM_PRICES, SupportedCurrency, detectUserCurrency } from '@/lib/currencyUtils';
import { CheckSubscriptionResponse } from '@/types/api';
import { CheckSubscriptionSchema } from '@/lib/validation';

// Product/Price mapping for Noteshare Premium
export const SUBSCRIPTION_TIERS = {
  premium: {
    product_id: "prod_ToONzcZjkyqsAJ",
    prices: PREMIUM_PRICES,
    name: "Premium",
  },
  lifetime: {
    product_id: "prod_TsrnqaaViDJAas",
    price_id: "price_1Sv63tGiNcIsULtk4t3RRrAK",
    name: "Lifetime Premium",
    price_cad: 1999, // $19.99 CAD in cents
  }
} as const;

interface SubscriptionState {
  subscribed: boolean;
  productId: string | null;
  subscriptionEnd: string | null;
  isLifetime: boolean;
  isLoading: boolean;
  hasCheckedOnce: boolean;
  hasValidatedWithUser: boolean;
  error: string | null;
}

export function useSubscription() {
  const { user } = useAuth();
  const lastCheckRef = useRef<number>(0);
  // Track which user ID we've already fetched for — prevents duplicate calls
  // when `user` object reference changes but the ID stays the same
  const fetchedForUserRef = useRef<string | null>(null);
  const [state, setState] = useState<SubscriptionState>({
    subscribed: false,
    productId: null,
    subscriptionEnd: null,
    isLifetime: false,
    isLoading: true,
    hasCheckedOnce: false,
    hasValidatedWithUser: false,
    error: null,
  });

  // Use a ref so the callback identity is stable (doesn't change when `user` changes)
  const userRef = useRef(user);
  userRef.current = user;

  const checkSubscription = useCallback(async () => {
    if (!userRef.current) {
      setState({
        subscribed: false,
        productId: null,
        subscriptionEnd: null,
        isLifetime: false,
        isLoading: false,
        hasCheckedOnce: true,
        hasValidatedWithUser: false,
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
      const { data: raw, error } = await supabase.functions.invoke('check-subscription');
      if (error) throw error;
      const data = CheckSubscriptionSchema.parse(raw);

      setState({
        subscribed: data.subscribed || false,
        productId: data.product_id || null,
        subscriptionEnd: data.subscription_end || null,
        isLifetime: data.is_lifetime || false,
        isLoading: false,
        hasCheckedOnce: true,
        hasValidatedWithUser: true, // Successfully validated with user
        error: null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('Error checking subscription:', err);

      // If auth token is stale/expired, try a silent refresh once, then fall back to "not subscribed"
      if (message.includes('Auth session missing')) {
        try {
          await supabase.auth.refreshSession();
          const { data: raw, error } = await supabase.functions.invoke('check-subscription');
          if (!error) {
            const data = CheckSubscriptionSchema.parse(raw);
            setState({
              subscribed: data?.subscribed || false,
              productId: data?.product_id || null,
              subscriptionEnd: data?.subscription_end || null,
              isLifetime: data?.is_lifetime || false,
              isLoading: false,
              hasCheckedOnce: true,
              hasValidatedWithUser: true,
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
          isLifetime: false,
          isLoading: false,
          hasCheckedOnce: true,
          hasValidatedWithUser: false, // Session failed, no valid user
          error: null,
        });
        return;
      }

      setState(prev => ({
        ...prev,
        isLoading: false,
        hasCheckedOnce: true,
        hasValidatedWithUser: true, // Mark as validated even on error to prevent infinite loading
        error: message || 'Failed to check subscription',
      }));
    }
  }, []); // Stable callback — uses userRef internally

  // Check subscription once per user ID — not on every `user` object change
  useEffect(() => {
    const userId = user?.id ?? null;

    // If user is null, reset and mark as checked
    if (!userId) {
      fetchedForUserRef.current = null;
      setState({
        subscribed: false,
        productId: null,
        subscriptionEnd: null,
        isLifetime: false,
        isLoading: false,
        hasCheckedOnce: true,
        hasValidatedWithUser: false,
        error: null,
      });
      return;
    }

    // Skip if we already fetched for this exact user
    if (fetchedForUserRef.current === userId) return;
    fetchedForUserRef.current = userId;
    lastCheckRef.current = Date.now();
    checkSubscription();
  }, [user?.id, checkSubscription]);

  // Listen for checkout completion to refresh subscription status
  // Throttle to once per 30 seconds to prevent duplicate fires
  useEffect(() => {
    if (!user) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now();
        // Skip if we've checked recently (prevents double-fire with initial mount)
        if (now - lastCheckRef.current < 30_000) return;
        lastCheckRef.current = now;
        checkSubscription();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user, checkSubscription]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const startLifetimeCheckout = async (currency?: SupportedCurrency) => {
    if (!user) {
      throw new Error('Must be logged in to purchase');
    }

    const currencyToUse = currency ?? detectUserCurrency();

    try {
      const { data, error } = await supabase.functions.invoke('create-lifetime-checkout', {
        body: { currency: currencyToUse }
      });
      
      if (error) throw error;
      if (!data?.url) throw new Error('No checkout URL returned');

      // Open Stripe checkout in new tab
      window.open(data.url, '_blank');
    } catch (err) {
      console.error('Error starting lifetime checkout:', err);
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

      // Navigate in same tab (window.open gets blocked on mobile Safari)
      window.location.href = data.url;
    } catch (err) {
      console.error('Error opening customer portal:', err);
      throw err;
    }
  };

  // Check against premium product IDs (supports all subscription and lifetime variants)
  const VALID_PREMIUM_PRODUCT_IDS = [
    SUBSCRIPTION_TIERS.premium.product_id,  // prod_ToONzcZjkyqsAJ - main premium
    SUBSCRIPTION_TIERS.lifetime.product_id, // prod_TsrnqaaViDJAas - old $19.99 lifetime
    'prod_TtwaOYfMnVypk4',                  // CAD $9.99 lifetime product
    'prod_Tu2MnCtrEfyciQ',                  // USD $9.99 lifetime product
    'prod_Tu2GAnzdYIrnKZ',                  // CAD $1.99/mo subscription
    'prod_Tu2LNk7QzsQY2k',                  // USD $1.99/mo subscription
    'prod_TofQhqCDH1KicB',                  // legacy USD product
    'prod_TofQx0QRLi6tEe',                  // legacy CAD product
  ];
  
  const isPremium = state.subscribed && VALID_PREMIUM_PRODUCT_IDS.includes(state.productId ?? '');

  // Derive "truly loading" state: stay loading if user exists but we haven't validated yet
  const isTrulyLoading = state.isLoading || (!!user && !state.hasValidatedWithUser);

  return {
    ...state,
    isLoading: isTrulyLoading, // Override with derived loading state
    isPremium,
    checkSubscription,
    startCheckout,
    startLifetimeCheckout,
    openCustomerPortal,
  };
}
