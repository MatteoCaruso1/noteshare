import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

interface TourStep {
  targetSelector: string;
  message: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
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
];

interface SpotlightTourProps {
  step: number; // 1-5 (step 5 is the final message)
  onNext: () => void;
  onComplete: () => void;
}

export function SpotlightTour({ step, onNext, onComplete }: SpotlightTourProps) {
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const isFinalStep = step === 5;
  const currentTourStep = !isFinalStep ? tourSteps[step - 1] : null;

  const updateTargetRect = useCallback(() => {
    if (currentTourStep) {
      const element = document.querySelector(currentTourStep.targetSelector);
      if (element) {
        const rect = element.getBoundingClientRect();
        setTargetRect(rect);
      }
    }
  }, [currentTourStep]);

  useEffect(() => {
    if (isFinalStep) {
      setTargetRect(null);
      return;
    }

    setIsAnimating(true);
    const timer = setTimeout(() => setIsAnimating(false), 300);

    updateTargetRect();

    // Update on scroll/resize
    window.addEventListener('scroll', updateTargetRect, true);
    window.addEventListener('resize', updateTargetRect);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', updateTargetRect, true);
      window.removeEventListener('resize', updateTargetRect);
    };
  }, [step, isFinalStep, updateTargetRect]);

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
                className={cn(
                  'transition-all duration-300 ease-out',
                  isAnimating && 'opacity-0'
                )}
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
          />
        </svg>
      ) : (
        <div className="fixed inset-0 bg-black/80" />
      )}

      {/* Highlighted element border */}
      {targetRect && !isFinalStep && (
        <div
          className={cn(
            'fixed rounded-xl border-2 border-primary pointer-events-none transition-all duration-300 ease-out',
            isAnimating && 'opacity-0 scale-95'
          )}
          style={{
            left: targetRect.left - 8,
            top: targetRect.top - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
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
          className={cn(
            'fixed max-w-xs px-4 py-3 bg-card border border-border rounded-xl shadow-lg transition-all duration-300 ease-out',
            isAnimating && 'opacity-0 translate-y-2'
          )}
          style={getTooltipStyle()}
        >
          <p className="text-sm text-foreground text-center font-medium">
            {currentTourStep.message}
          </p>
          <p className="text-xs text-muted-foreground text-center mt-2">
            Tap anywhere to continue
          </p>
        </div>
      )}

      {/* Step indicator */}
      {!isFinalStep && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={cn(
                'w-2 h-2 rounded-full transition-colors',
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
