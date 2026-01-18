import React, { createContext, useContext, ReactNode } from 'react';
import { useSubscription, SUBSCRIPTION_TIERS } from '@/hooks/useSubscription';

interface PremiumContextType {
  isPremium: boolean;
  isLoading: boolean;
  startCheckout: () => Promise<void>;
  openCustomerPortal: () => Promise<void>;
  checkSubscription: () => Promise<void>;
}

const PremiumContext = createContext<PremiumContextType | undefined>(undefined);

export function PremiumProvider({ children }: { children: ReactNode }) {
  const { 
    isPremium, 
    isLoading, 
    startCheckout, 
    openCustomerPortal,
    checkSubscription 
  } = useSubscription();

  return (
    <PremiumContext.Provider value={{ 
      isPremium, 
      isLoading, 
      startCheckout, 
      openCustomerPortal,
      checkSubscription 
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
