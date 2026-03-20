import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { clearScrollState } from '@/hooks/useScrollRestoration';

interface OnboardingContextType {
  showOnboarding: boolean;
  startOnboarding: () => void;
  completeOnboarding: () => void;
  currentStep: number;
  nextStep: () => void;
  isWelcomeStep: boolean;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

// Global flag accessible outside React tree (e.g. from hooks like useSessions)
export let isOnboardingActive = false;

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const { profile, isNewUser, clearNewUserFlag } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [currentStep, setCurrentStep] = useState(0); // 0 = welcome modal

  // Fire-and-forget tracking of each onboarding step reached
  // Accepts an explicit userId to avoid stale closure issues during auto-trigger
  const trackStep = (step: number, explicitUserId?: string) => {
    const userId = explicitUserId || profile?.user_id;
    if (!userId) {
      console.debug('[Onboarding] trackStep skipped – no user_id for step', step);
      return;
    }
    supabase
      .from('onboarding_step_events')
      .upsert({ user_id: userId, step_number: step }, { onConflict: 'user_id,step_number' })
      .then(({ error }) => {
        if (error) console.debug('Onboarding step tracking error:', error.message);
      });
  };

  const startOnboarding = (userId?: string) => {
    setCurrentStep(0);
    setShowOnboarding(true);
    isOnboardingActive = true;
    trackStep(0, userId);
  };

  const completeOnboarding = () => {
    if (profile?.id) {
      // Persist in DB — fire and forget
      supabase.from('profiles').update({ has_completed_onboarding: true }).eq('id', profile.id).then(() => {});
    }
    setShowOnboarding(false);
    setCurrentStep(0);
    isOnboardingActive = false;
    clearNewUserFlag();
    
    // Reset scroll position and clear saved scroll state to prevent "creeping header"
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    clearScrollState('index-timeline');
    clearScrollState('index-feed');
    
    // Check for profile redirect (from shared profile link signup flow)
    const profileRedirect = localStorage.getItem('noteshare_profile_redirect');
    if (profileRedirect) {
      localStorage.removeItem('noteshare_profile_redirect');
      window.location.href = `/profile/${profileRedirect}`;
    }
  };

  const nextStep = () => {
    const next = currentStep + 1;
    if (next > 11) {
      completeOnboarding();
    } else {
      setCurrentStep(next);
      trackStep(next);
    }
  };

  // Auto-trigger onboarding for truly new users (detected via profile creation time)
  // Guard: only trigger if user is actually authenticated (has a profile with user_id)
  useEffect(() => {
    if (isNewUser && profile?.id && profile?.user_id) {
      if (!profile.has_completed_onboarding) {
        console.log('[Onboarding] New user detected, starting onboarding');
        // Scroll to top so the welcome modal doesn't appear over a scrolled-down page
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
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
