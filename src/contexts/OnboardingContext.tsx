import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface OnboardingContextType {
  showOnboarding: boolean;
  startOnboarding: () => void;
  completeOnboarding: () => void;
  currentStep: number;
  nextStep: () => void;
  isWelcomeStep: boolean;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const { profile, isNewUser, clearNewUserFlag } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [currentStep, setCurrentStep] = useState(0); // 0 = welcome modal

  const startOnboarding = () => {
    setCurrentStep(0);
    setShowOnboarding(true);
  };

  const completeOnboarding = () => {
    if (profile?.id) {
      // Persist in DB — fire and forget
      supabase.from('profiles').update({ has_completed_onboarding: true }).eq('id', profile.id).then(() => {});
    }
    setShowOnboarding(false);
    setCurrentStep(0);
    clearNewUserFlag();
    
    // Check for profile redirect (from shared profile link signup flow)
    const profileRedirect = localStorage.getItem('noteshare_profile_redirect');
    if (profileRedirect) {
      localStorage.removeItem('noteshare_profile_redirect');
      window.location.href = `/profile/${profileRedirect}`;
    }
  };

  const nextStep = () => {
    if (currentStep >= 7) {
      completeOnboarding();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  // Auto-trigger onboarding for truly new users (detected via profile creation time)
  useEffect(() => {
    if (isNewUser && profile?.id) {
      if (!profile.has_completed_onboarding) {
        console.log('[Onboarding] New user detected, starting onboarding');
        startOnboarding();
      } else {
        clearNewUserFlag();
      }
    }
  }, [isNewUser, profile?.id]);

  return (
    <OnboardingContext.Provider
      value={{
        showOnboarding,
        startOnboarding,
        completeOnboarding,
        currentStep,
        nextStep,
        isWelcomeStep: currentStep === 0,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}
