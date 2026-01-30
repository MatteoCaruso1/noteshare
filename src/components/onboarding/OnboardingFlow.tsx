import { useOnboarding } from '@/contexts/OnboardingContext';
import { WelcomeOnboardingModal } from './WelcomeOnboardingModal';
import { SpotlightTour } from './SpotlightTour';

export function OnboardingFlow() {
  const { showOnboarding, currentStep, nextStep, completeOnboarding, isWelcomeStep } = useOnboarding();

  if (!showOnboarding) return null;

  // Step 0 = Welcome modal
  if (isWelcomeStep) {
    return (
      <WelcomeOnboardingModal 
        open={true} 
        onGetStarted={nextStep} 
      />
    );
  }

  // Steps 1-5 = Spotlight tour
  return (
    <SpotlightTour
      step={currentStep}
      onNext={nextStep}
      onComplete={completeOnboarding}
    />
  );
}
