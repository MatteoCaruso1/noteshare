import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';

const ONBOARDING_COMPLETED_KEY = 'noteshare_onboarding_completed';

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

  // Check if user has completed onboarding
  const hasCompletedOnboarding = (userId: string) => {
    try {
      const completed = localStorage.getItem(`${ONBOARDING_COMPLETED_KEY}_${userId}`);
      return completed === 'true';
    } catch {
      return false;
    }
  };

  const markOnboardingCompleted = (userId: string) => {
    try {
      localStorage.setItem(`${ONBOARDING_COMPLETED_KEY}_${userId}`, 'true');
    } catch {
      // Ignore storage errors
    }
  };

  const startOnboarding = () => {
    setCurrentStep(0);
    setShowOnboarding(true);
  };

  const completeOnboarding = () => {
    if (profile?.id) {
      markOnboardingCompleted(profile.id);
    }
    setShowOnboarding(false);
    setCurrentStep(0);
    // Clear the new user flag so it doesn't re-trigger
    clearNewUserFlag();
    
    // Check for profile redirect (from shared profile link signup flow)
    const profileRedirect = localStorage.getItem('noteshare_profile_redirect');
    if (profileRedirect) {
      localStorage.removeItem('noteshare_profile_redirect');
      // Use window.location since OnboardingProvider is outside BrowserRouter
      window.location.href = `/profile/${profileRedirect}`;
    }
  };

  const nextStep = () => {
    if (currentStep >= 6) {
      completeOnboarding();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  // Auto-trigger onboarding for truly new users (detected via profile creation time)
  // This handles OAuth signups where we can't distinguish signup from signin at call time
  useEffect(() => {
    if (isNewUser && profile?.id) {
      // Double-check localStorage in case they completed it before
      const alreadyCompleted = hasCompletedOnboarding(profile.id);
      if (!alreadyCompleted) {
        console.log('[Onboarding] New user detected, starting onboarding');
        startOnboarding();
      } else {
        // They've completed before, clear the flag
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

// Helper to check if user has completed onboarding (for external use)
export function checkOnboardingCompleted(userId: string): boolean {
  try {
    const completed = localStorage.getItem(`${ONBOARDING_COMPLETED_KEY}_${userId}`);
    return completed === 'true';
  } catch {
    return false;
  }
}
