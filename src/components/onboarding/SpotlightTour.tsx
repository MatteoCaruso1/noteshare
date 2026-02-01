import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface TourStep {
  targetSelector: string;
  message: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  navigateTo?: string; // Route to navigate to before showing this step
}

const tourSteps: TourStep[] = [
  {
    targetSelector: '[data-tour="practice-capture"]',
    message: 'Record your practice with Practice Sessions or Quick Notes',
    position: 'bottom',
  },
  {
    targetSelector: '[data-tour="practice-board"]',
    message: 'Manage your practice priorities with the Practice Board',
    position: 'bottom',
  },
  {
    targetSelector: '[data-tour="timeline"]',
    message: 'View your practice history',
    position: 'top',
  },
  {
    targetSelector: '[data-tour="friends-nav"]',
    message: "See what your friends are practicing!",
    position: 'top',
  },
  {
    targetSelector: '[data-tour="help-tips"]',
    message: 'Learn how to best leverage Noteshare using the tips button',
    position: 'bottom',
    navigateTo: '/profile',
  },
];

interface SpotlightTourProps {
  step: number; // 1-6 (step 6 is the final message)
  onNext: () => void;
  onComplete: () => void;
}

export function SpotlightTour({ step, onNext, onComplete }: SpotlightTourProps) {
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const isFinalStep = step === 6;
  const currentTourStep = !isFinalStep ? tourSteps[step - 1] : null;

  const updateTargetRect = useCallback(() => {
    if (currentTourStep) {
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
    if (isFinalStep) {
      setTargetRect(null);
      setIsNavigating(false);
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
  }, [step, isFinalStep, currentTourStep, location.pathname, navigate, updateTargetRect]);

  const handleClick = () => {
    if (isFinalStep) {
      onComplete();
    } else {
      onNext();
    }
  };

  // Calculate tooltip position
  const getTooltipStyle = (): React.CSSProperties => {
    if (!targetRect || !currentTourStep) return {};

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
      {targetRect && !isFinalStep ? (
        <svg className="fixed inset-0 w-full h-full pointer-events-none">
          <defs>
            <mask id="spotlight-mask">
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
            mask="url(#spotlight-mask)"
            style={{ transition: 'opacity 400ms cubic-bezier(0.4, 0, 0.2, 1)' }}
          />
        </svg>
      ) : (
        <div className="fixed inset-0 bg-black/80" />
      )}

      {/* Highlighted element border */}
      {targetRect && !isFinalStep && (
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
      {isFinalStep ? (
        // Final centered message
        <div className="fixed inset-0 flex flex-col items-center justify-center px-8 text-center">
          <div className="animate-scale-in">
            <p className="text-2xl font-semibold text-foreground mb-4">
              Happy practicing! 🎵
            </p>
            <p className="text-lg text-muted-foreground mb-8">
              Have fun exploring all Noteshare has to offer
            </p>
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
          <p className="text-xs text-muted-foreground text-center mt-2">
            Tap anywhere to continue
          </p>
        </div>
      )}

      {/* Step indicator - hide on step 4 (friends nav) since it overlaps with bottom nav */}
      {!isFinalStep && step !== 4 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2">
          {[1, 2, 3, 4, 5].map((s) => (
            <div
              key={s}
              className={cn(
                'w-2 h-2 rounded-full transition-colors duration-300',
                s === step ? 'bg-primary' : 'bg-muted-foreground/40'
              )}
            />
          ))}
        </div>
      )}
    </div>
  );

  return createPortal(content, document.body);
}
