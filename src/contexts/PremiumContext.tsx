import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import { useSubscription, SUBSCRIPTION_TIERS } from '@/hooks/useSubscription';
import { detectUserCurrency, SupportedCurrency } from '@/lib/currencyUtils';

interface PremiumContextType {
  isPremium: boolean;
  isLoading: boolean;
  isLifetime: boolean;
  openCustomerPortal: () => Promise<void>;
  checkSubscription: () => Promise<void>;
  // Premium dialog state
  isPremiumDialogOpen: boolean;
  openPremiumDialog: () => void;
  closePremiumDialog: () => void;
  // Checkout dialog state (subscription)
  isCheckoutDialogOpen: boolean;
  openCheckoutDialog: () => void;
  closeCheckoutDialog: () => void;
  // Lifetime checkout dialog state
  isLifetimeCheckoutDialogOpen: boolean;
  openLifetimeCheckoutDialog: () => void;
  closeLifetimeCheckoutDialog: () => void;
  // Currency
  detectedCurrency: SupportedCurrency;
}

const PremiumContext = createContext<PremiumContextType | undefined>(undefined);

export function PremiumProvider({ children }: { children: ReactNode }) {
  const { 
    isPremium, 
    isLoading,
    isLifetime,
    openCustomerPortal,
    checkSubscription,
  } = useSubscription();

  // Premium dialog state
  const [isPremiumDialogOpen, setIsPremiumDialogOpen] = useState(false);
  
  // Checkout dialog state (subscription)
  const [isCheckoutDialogOpen, setIsCheckoutDialogOpen] = useState(false);
  
  // Lifetime checkout dialog state
  const [isLifetimeCheckoutDialogOpen, setIsLifetimeCheckoutDialogOpen] = useState(false);
  
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

  const openCheckoutDialog = useCallback(() => {
    setIsCheckoutDialogOpen(true);
  }, []);

  const closeCheckoutDialog = useCallback(() => {
    setIsCheckoutDialogOpen(false);
  }, []);

  const openLifetimeCheckoutDialog = useCallback(() => {
    setIsLifetimeCheckoutDialogOpen(true);
  }, []);

  const closeLifetimeCheckoutDialog = useCallback(() => {
    setIsLifetimeCheckoutDialogOpen(false);
  }, []);

  return (
    <PremiumContext.Provider value={{ 
      isPremium, 
      isLoading,
      isLifetime,
      openCustomerPortal,
      checkSubscription,
      isPremiumDialogOpen,
      openPremiumDialog,
      closePremiumDialog,
      isCheckoutDialogOpen,
      openCheckoutDialog,
      closeCheckoutDialog,
      isLifetimeCheckoutDialogOpen,
      openLifetimeCheckoutDialog,
      closeLifetimeCheckoutDialog,
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
