import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import { useSubscription, SUBSCRIPTION_TIERS } from '@/hooks/useSubscription';
import { detectUserCurrency, SupportedCurrency } from '@/lib/currencyUtils';

interface PremiumContextType {
  isPremium: boolean;
  isLoading: boolean;
  startCheckout: () => Promise<void>;
  openCustomerPortal: () => Promise<void>;
  checkSubscription: () => Promise<void>;
  // Premium dialog state
  isPremiumDialogOpen: boolean;
  openPremiumDialog: () => void;
  closePremiumDialog: () => void;
  // Currency
  detectedCurrency: SupportedCurrency;
}

const PremiumContext = createContext<PremiumContextType | undefined>(undefined);

export function PremiumProvider({ children }: { children: ReactNode }) {
  const { 
    isPremium, 
    isLoading, 
    startCheckout: startCheckoutWithCurrency, 
    openCustomerPortal,
    checkSubscription 
  } = useSubscription();

  // Premium dialog state
  const [isPremiumDialogOpen, setIsPremiumDialogOpen] = useState(false);
  
  // Detect currency on mount
  const [detectedCurrency, setDetectedCurrency] = useState<SupportedCurrency>('USD');
  
  useEffect(() => {
    setDetectedCurrency(detectUserCurrency());
  }, []);

  const openPremiumDialog = useCallback(() => {
    setIsPremiumDialogOpen(true);
  }, []);

  const closePremiumDialog = useCallback(() => {
    setIsPremiumDialogOpen(false);
  }, []);

  // Wrap startCheckout to pass detected currency
  const startCheckout = useCallback(async () => {
    await startCheckoutWithCurrency(detectedCurrency);
  }, [startCheckoutWithCurrency, detectedCurrency]);

  return (
    <PremiumContext.Provider value={{ 
      isPremium, 
      isLoading, 
      startCheckout, 
      openCustomerPortal,
      checkSubscription,
      isPremiumDialogOpen,
      openPremiumDialog,
      closePremiumDialog,
      detectedCurrency,
    }}>
      {children}
    </PremiumContext.Provider>
  );
}

export function usePremium() {
  const context = useContext(PremiumContext);
  if (context === undefined) {
    throw new Error('usePremium must be used within a PremiumProvider');
  }
  return context;
}

// Re-export for convenience
export { SUBSCRIPTION_TIERS };
