import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useShareEducation } from '@/contexts/ShareEducationContext';

interface TourStep {
  targetSelector?: string;
  message: string;
  subMessage?: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  navigateTo?: string; // Route to navigate to before showing this step
  action?: 'click' | 'observe'; // What the user should do
}

export function ShareEducationTour() {
  const { 
    showShareEducation, 
    currentStep, 
    noteIdToShow, 
    nextStep, 
    completeShareEducation 
  } = useShareEducation();
  
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Define tour steps dynamically based on noteIdToShow
  const tourSteps: TourStep[] = [
    // Step 0: Intro message
    {
      message: 'Did you know you can share notes with friends outside of Noteshare?',
      subMessage: 'Share your progress with the world! Let\'s show you how.',
      position: 'center',
    },
    // Step 1: Navigate to note and highlight it
    {
      targetSelector: `[data-note-id="${noteIdToShow}"]`,
      message: 'Tap on your note to open it',
      position: 'bottom',
      navigateTo: '/',
      action: 'click',
    },
    // Step 2: On note detail page, highlight share button
    {
      targetSelector: '[data-tour="share-button"]',
      message: 'Tap the share button to share your note',
      position: 'bottom',
      navigateTo: `/notes/${noteIdToShow}`,
      action: 'click',
    },
    // Step 3: Share dialog is open, show options
    {
      targetSelector: '[data-tour="share-options"]',
      message: 'Choose how you want to share your practice',
      subMessage: 'Share via iMessage, save the image, or customize your card!',
      position: 'top',
      action: 'observe',
    },
    // Step 4: Final message
    {
      message: 'You\'re all set! 🎉',
      subMessage: 'Now you know how to share your practice journey with anyone.',
      position: 'center',
    },
  ];

  const isFinalStep = currentStep === 4;
  const isIntroStep = currentStep === 0;
  const currentTourStep = tourSteps[currentStep] || null;

  const updateTargetRect = useCallback(() => {
    if (currentTourStep?.targetSelector) {
      const element = document.querySelector(currentTourStep.targetSelector);
      if (element) {
        const rect = element.getBoundingClientRect();
        setTargetRect(rect);
        return true;
      }
    }
    return false;
  }, [currentTourStep]);

  useEffect(() => {
    if (!showShareEducation) return;

    // Center steps don't need target rect
    if (currentTourStep?.position === 'center') {
      setTargetRect(null);
      setIsNavigating(false);
      setIsAnimating(false);
      return;
    }

    // Check if we need to navigate to a different page
    if (currentTourStep?.navigateTo && location.pathname !== currentTourStep.navigateTo) {
      setIsNavigating(true);
      setIsAnimating(true);
      navigate(currentTourStep.navigateTo);
      return;
    }

    setIsAnimating(true);
    
    // Wait for navigation/DOM to settle, then find the element
    const findElement = () => {
      const found = updateTargetRect();
      if (found) {
        setIsNavigating(false);
        setTimeout(() => setIsAnimating(false), 350);
      } else {
        // Element not found yet, retry
        setTimeout(findElement, 100);
      }
    };

    // Use requestAnimationFrame for smoother animation sync
    requestAnimationFrame(() => {
      setTimeout(findElement, 100);
    });

    // Update on scroll/resize
    window.addEventListener('scroll', updateTargetRect, true);
    window.addEventListener('resize', updateTargetRect);

    return () => {
      window.removeEventListener('scroll', updateTargetRect, true);
      window.removeEventListener('resize', updateTargetRect);
    };
  }, [showShareEducation, currentStep, currentTourStep, location.pathname, navigate, updateTargetRect]);

  const handleClick = () => {
    if (isFinalStep) {
      // Navigate back to My Practice before completing
      if (location.pathname !== '/') {
        setIsAnimating(true);
        navigate('/');
        setTimeout(() => {
          completeShareEducation();
        }, 100);
      } else {
        completeShareEducation();
      }
    } else if (currentTourStep?.action === 'click') {
      // For click steps, the user needs to click the target - don't advance on overlay click
      return;
    } else {
      nextStep();
    }
  };

  // Handle target element click for "click" action steps
  useEffect(() => {
    if (!showShareEducation) return;
    if (currentTourStep?.action !== 'click') return;
    if (!currentTourStep.targetSelector) return;

    const handleTargetClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const selector = currentTourStep.targetSelector!;
      const targetElement = document.querySelector(selector);
      
      if (targetElement && (targetElement === target || targetElement.contains(target))) {
        // User clicked the target, advance to next step after a small delay
        setTimeout(() => {
          nextStep();
        }, 300);
      }
    };

    document.addEventListener('click', handleTargetClick, true);
    return () => document.removeEventListener('click', handleTargetClick, true);
  }, [showShareEducation, currentStep, currentTourStep, nextStep]);

  if (!showShareEducation) return null;

  // Calculate tooltip position
  const getTooltipStyle = (): React.CSSProperties => {
    if (!targetRect || !currentTourStep || currentTourStep.position === 'center') return {};

    const padding = 16;
    const position = currentTourStep.position || 'bottom';

    switch (position) {
      case 'top':
        return {
          bottom: window.innerHeight - targetRect.top + padding,
          left: '50%',
          transform: 'translateX(-50%)',
        };
      case 'bottom':
        return {
          top: targetRect.bottom + padding,
          left: '50%',
          transform: 'translateX(-50%)',
        };
      default:
        return {
          top: targetRect.bottom + padding,
          left: '50%',
          transform: 'translateX(-50%)',
        };
    }
  };

  const content = (
    <div 
      className="fixed inset-0 z-[100]"
      onClick={handleClick}
    >
      {/* Overlay with spotlight cutout */}
      {targetRect && !isIntroStep && !isFinalStep ? (
        <svg className="fixed inset-0 w-full h-full pointer-events-none">
          <defs>
            <mask id="share-spotlight-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              <rect
                x={targetRect.left - 8}
                y={targetRect.top - 8}
                width={targetRect.width + 16}
                height={targetRect.height + 16}
                rx="12"
                fill="black"
                style={{
                  transition: 'all 400ms cubic-bezier(0.4, 0, 0.2, 1)',
                  opacity: isAnimating ? 0 : 1,
                }}
              />
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(0, 0, 0, 0.8)"
            mask="url(#share-spotlight-mask)"
            style={{ transition: 'opacity 400ms cubic-bezier(0.4, 0, 0.2, 1)' }}
          />
        </svg>
      ) : (
        <div className="fixed inset-0 bg-black/80" />
      )}

      {/* Highlighted element border */}
      {targetRect && !isIntroStep && !isFinalStep && (
        <div
          className="fixed rounded-xl border-2 border-primary pointer-events-none"
          style={{
            left: targetRect.left - 8,
            top: targetRect.top - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
            transition: 'all 400ms cubic-bezier(0.4, 0, 0.2, 1)',
            opacity: isAnimating ? 0 : 1,
            transform: isAnimating ? 'scale(0.95)' : 'scale(1)',
          }}
        />
      )}

      {/* Tooltip / Message */}
      {(isIntroStep || isFinalStep) ? (
        // Centered message for intro and final
        <div className="fixed inset-0 flex flex-col items-center justify-center px-8 text-center">
          <div className="animate-scale-in">
            <p className="text-2xl font-semibold text-foreground mb-4">
              {currentTourStep?.message}
            </p>
            {currentTourStep?.subMessage && (
              <p className="text-lg text-muted-foreground mb-8">
                {currentTourStep.subMessage}
              </p>
            )}
            <p className="text-sm text-muted-foreground/60">
              Tap anywhere to continue
            </p>
          </div>
        </div>
      ) : targetRect && currentTourStep && (
        <div
          className="fixed max-w-xs px-4 py-3 bg-card border border-border rounded-xl shadow-lg"
          style={{
            ...getTooltipStyle(),
            transition: 'all 400ms cubic-bezier(0.4, 0, 0.2, 1)',
            opacity: isAnimating ? 0 : 1,
            transform: `translateX(-50%) ${isAnimating ? 'translateY(8px)' : 'translateY(0)'}`,
          }}
        >
          <p className="text-sm text-foreground text-center font-medium">
            {currentTourStep.message}
          </p>
          {currentTourStep.subMessage && (
            <p className="text-xs text-muted-foreground text-center mt-1">
              {currentTourStep.subMessage}
            </p>
          )}
          <p className="text-xs text-muted-foreground text-center mt-2">
            {currentTourStep.action === 'click' ? 'Tap the highlighted area' : 'Tap anywhere to continue'}
          </p>
        </div>
      )}

      {/* Step indicator - for middle steps */}
      {!isIntroStep && !isFinalStep && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={cn(
                'w-2 h-2 rounded-full transition-colors duration-300',
                s === currentStep ? 'bg-primary' : 'bg-muted-foreground/40'
              )}
            />
          ))}
        </div>
      )}
    </div>
  );

  return createPortal(content, document.body);
}
