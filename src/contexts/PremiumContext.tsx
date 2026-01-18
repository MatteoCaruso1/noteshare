import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import { useSubscription, SUBSCRIPTION_TIERS } from '@/hooks/useSubscription';
import { detectUserCurrency, SupportedCurrency } from '@/lib/currencyUtils';

interface PremiumContextType {
  isPremium: boolean;
  isLoading: boolean;
  startCheckout: () => void;
  openCustomerPortal: () => Promise<void>;
  checkSubscription: () => Promise<void>;
  // Premium dialog state
  isPremiumDialogOpen: boolean;
  openPremiumDialog: () => void;
  closePremiumDialog: () => void;
  // Currency
  detectedCurrency: SupportedCurrency;
  // Navigation function for checkout
  navigateToCheckout: () => void;
}

const PremiumContext = createContext<PremiumContextType | undefined>(undefined);

// Navigation callback for checkout - set by component inside Router
let navigateToCheckoutCallback: (() => void) | null = null;

export function setNavigateToCheckout(fn: () => void) {
  navigateToCheckoutCallback = fn;
}

export function PremiumProvider({ children }: { children: ReactNode }) {
  const { 
    isPremium, 
    isLoading, 
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

  // Navigate to embedded checkout page instead of Stripe redirect
  const navigateToCheckout = useCallback(() => {
    if (navigateToCheckoutCallback) {
      navigateToCheckoutCallback();
    } else {
      // Fallback: direct navigation if callback not set
      window.location.href = '/checkout';
    }
  }, []);

  // startCheckout now navigates to the embedded checkout page
  const startCheckout = useCallback(() => {
    navigateToCheckout();
  }, [navigateToCheckout]);

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
      navigateToCheckout,
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
