import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SupportedCurrency } from '@/lib/currencyUtils';
import { CreateCheckoutEmbeddedResponse } from '@/types/api';

interface EmbeddedCheckoutState {
  clientSecret: string | null;
  sessionId: string | null;
  trialEndDate: string | null;
  trialOffered: boolean | null;
  isLoading: boolean;
  error: string | null;
}

export function useEmbeddedCheckout() {
  const [state, setState] = useState<EmbeddedCheckoutState>({
    clientSecret: null,
    sessionId: null,
    trialEndDate: null,
    trialOffered: null,
    isLoading: false,
    error: null,
  });

  const initializeCheckout = useCallback(async (currency: SupportedCurrency = 'USD') => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-embedded', {
        body: { currency }
      });

      if (error) throw error;
      if (!data?.clientSecret) throw new Error('No client secret returned');

      setState({
        clientSecret: data.clientSecret,
        sessionId: data.sessionId,
        trialEndDate: data.trialEndDate,
        trialOffered: data.trialOffered ?? null,
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
      trialEndDate: null,
      trialOffered: null,
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
