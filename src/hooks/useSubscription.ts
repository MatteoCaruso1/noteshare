import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { PREMIUM_PRICES, SupportedCurrency, detectUserCurrency } from '@/lib/currencyUtils';
import { CheckSubscriptionSchema } from '@/lib/validation';

// Product/Price mapping for Noteshare Premium
export const SUBSCRIPTION_TIERS = {
  premium: {
    product_id: "prod_UGH5hVuR8mAV9u",
    prices: PREMIUM_PRICES,
    name: "Premium",
  },
  lifetime: {
    product_id: "prod_UGH76Futsy9n9k",
    price_id: "price_1THkZ8GiNcIsULtkEhfGUmek",
    name: "Lifetime Premium",
    price_cad: 1499, // $14.99 CAD in cents
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
  const { user, session } = useAuth();
  const lastCheckRef = useRef<number>(0);
  // Track which exact auth session we have validated to avoid stale false negatives.
  const fetchedForAuthRef = useRef<string | null>(null);
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

  const runSubscriptionCheck = useCallback(async () => {
    const { data: raw, error } = await supabase.functions.invoke('check-subscription');
    if (error) throw error;
    return CheckSubscriptionSchema.parse(raw);
  }, []);

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
      const data = await runSubscriptionCheck();

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
      console.error('Error checking subscription:', err);

      try {
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError || !refreshData.session) {
          throw refreshError || new Error('Session refresh failed');
        }

        const data = await runSubscriptionCheck();
        setState({
          subscribed: data.subscribed || false,
          productId: data.product_id || null,
          subscriptionEnd: data.subscription_end || null,
          isLifetime: data.is_lifetime || false,
          isLoading: false,
          hasCheckedOnce: true,
          hasValidatedWithUser: true,
          error: null,
        });
        return;
      } catch (refreshErr) {
        const message = refreshErr instanceof Error ? refreshErr.message : String(refreshErr);
        console.warn('Subscription check: session refresh failed', refreshErr);
        setState(prev => ({
          ...prev,
          isLoading: false,
          hasCheckedOnce: true,
          hasValidatedWithUser: false,
          error: message || 'Failed to validate subscription',
        }));
      }
    }
  }, [runSubscriptionCheck]); // Stable callback — uses userRef internally

  // Check subscription once per authenticated session — token changes must revalidate premium.
  useEffect(() => {
    const userId = user?.id ?? null;
    const accessToken = session?.access_token ?? null;
    const authKey = userId && accessToken ? `${userId}:${accessToken}` : null;

    // If user is null, reset and mark as checked
    if (!userId) {
      fetchedForAuthRef.current = null;
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

    if (!authKey) {
      fetchedForAuthRef.current = null;
      setState(prev => ({ ...prev, isLoading: true, hasValidatedWithUser: false, error: null }));
      return;
    }

    if (fetchedForAuthRef.current === authKey) return;
    fetchedForAuthRef.current = authKey;
    lastCheckRef.current = Date.now();
    checkSubscription();
  }, [user?.id, session?.access_token, checkSubscription]);

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

  // The backend (check-subscription) is the single source of truth for premium status.
  // It checks: premium_overrides → user_entitlements (Apple IAP/lifetime) → Stripe.
  // The client trusts the backend's `subscribed` flag directly.
  // We keep VALID_PREMIUM_PRODUCT_IDS only for tier-specific UI (e.g. showing "Lifetime" badge).
  const VALID_PREMIUM_PRODUCT_IDS = [
    SUBSCRIPTION_TIERS.premium.product_id,
    SUBSCRIPTION_TIERS.lifetime.product_id,
    'prod_ToONzcZjkyqsAJ',
    'prod_TtwaOYfMnVypk4',
    'prod_Tu2MnCtrEfyciQ',
    'prod_TsrnqaaViDJAas',
    'prod_Tu2GAnzdYIrnKZ',
    'prod_Tu2LNk7QzsQY2k',
    'prod_TofQhqCDH1KicB',
    'prod_TofQx0QRLi6tEe',
    'apple_subscription',
  ];
  
  // Trust the backend: if subscribed is true, user is Pro.
  // No client-side product_id gate — the backend already validated entitlements.
  const isPremium = state.subscribed;

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
