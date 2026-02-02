import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SupportedCurrency, detectUserCurrency } from '@/lib/currencyUtils';

interface LifetimeCheckoutState {
  clientSecret: string | null;
  sessionId: string | null;
  isLoading: boolean;
  error: string | null;
}

export function useLifetimeCheckout() {
  const [state, setState] = useState<LifetimeCheckoutState>({
    clientSecret: null,
    sessionId: null,
    isLoading: false,
    error: null,
  });

  const initializeCheckout = useCallback(async (currency?: SupportedCurrency) => {
    const currencyToUse = currency ?? detectUserCurrency();
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const { data, error } = await supabase.functions.invoke('create-lifetime-checkout', {
        body: { currency: currencyToUse }
      });

      if (error) throw error;
      if (!data?.clientSecret) throw new Error('No client secret returned');

      setState({
        clientSecret: data.clientSecret,
        sessionId: data.sessionId,
        isLoading: false,
        error: null,
      });

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize checkout';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      throw err;
    }
  }, []);

  const resetCheckout = useCallback(() => {
    setState({
      clientSecret: null,
      sessionId: null,
      isLoading: false,
      error: null,
    });
  }, []);

  return {
    ...state,
    initializeCheckout,
    resetCheckout,
  };
}
