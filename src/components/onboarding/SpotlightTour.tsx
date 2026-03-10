import { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { Music } from 'lucide-react';
import { cn } from '@/lib/utils';
import { clearScrollState } from '@/hooks/useScrollRestoration';

interface TourStep {
  targetSelector: string;
  message: string;
  subMessage?: string;
  position?: 'top' | 'bottom';
  interactive?: boolean; // If true, user must click the actual element
  waitForSelector?: string; // Wait for this selector to appear before auto-advancing
  waitForRemoval?: string; // Wait for this selector to disappear before auto-advancing
  elevateParent?: boolean; // Elevate parent container too (for elements inside clipped containers)
}

const tourSteps: TourStep[] = [
  // Steps 1-3: Informational highlights (tap anywhere to continue)
  {
    targetSelector: '[data-tour="practice-start-btn"]',
    message: 'Start your practice sessions here',
    subMessage: 'Track your time, record clips, and take notes',
    position: 'bottom',
  },
  {
    targetSelector: '[data-tour="practice-board"]',
    message: 'Plan your practice priorities',
    subMessage: 'Your daily practice to-do list',
    position: 'bottom',
  },
  {
    targetSelector: '[data-tour="timeline"]',
    message: 'View your practice history',
    subMessage: 'All your sessions and notes appear here',
    position: 'top',
  },
  // Steps 4-5: Interactive - start a session
  {
    targetSelector: '[data-tour="practice-start-btn"]',
    message: 'Tap to open!',
    position: 'bottom',
    interactive: true,
    waitForSelector: '[data-tour="start-live-btn"]',
  },
  {
    targetSelector: '[data-tour="start-live-btn"]',
    message: 'Start a live session!',
    position: 'bottom',
    interactive: true,
    waitForSelector: '[data-tour="session-textarea"]',
    elevateParent: true,
  },
  // Steps 6-8: Informational highlights during active session
  {
    targetSelector: '[data-tour="session-textarea"]',
    message: 'Write what you\'re practicing',
    subMessage: 'Add notes, checklists, or a practice plan',
    position: 'bottom',
    elevateParent: true,
  },
  {
    targetSelector: '[data-tour="audio-recorder"]',
    message: 'Record audio clips',
    subMessage: 'Capture ideas during your session',
    position: 'top',
    elevateParent: true,
  },
  {
    targetSelector: '[data-tour="link-to-list"]',
    message: 'Link to your Practice List',
    subMessage: 'Toggle this to attach your session to today\'s list',
    position: 'top',
    elevateParent: true,
  },
  // Step 9: Interactive - end session
  {
    targetSelector: '[data-tour="end-session-btn"]',
    message: 'Tap to save your session!',
    position: 'top',
    interactive: true,
    waitForSelector: '[data-tour="save-session-btn"]',
    elevateParent: true,
  },
  // Step 10: Interactive - save in dialog
  {
    targetSelector: '[data-tour="save-session-btn"]',
    message: 'Review and save!',
    subMessage: 'Set your focus level, add who you practiced with, and more',
    position: 'top',
    interactive: true,
    waitForRemoval: '[data-tour="save-session-btn"]',
  },
];

const FINAL_STEP = tourSteps.length + 1; // step 11

interface SpotlightTourProps {
  step: number; // 1-11
  onNext: () => void;
  onComplete: () => void;
}

export function SpotlightTour({ step, onNext, onComplete }: SpotlightTourProps) {
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const elevatedElementsRef = useRef<HTMLElement[]>([]);

  const isFinalStep = step === FINAL_STEP;
  const currentTourStep = !isFinalStep && step >= 1 && step <= tourSteps.length
    ? tourSteps[step - 1]
    : null;

  // Clean up elevated elements
  const cleanupElevation = useCallback(() => {
    elevatedElementsRef.current.forEach(el => {
      el.style.removeProperty('position');
      el.style.removeProperty('z-index');
    });
    elevatedElementsRef.current = [];
  }, []);

  // Elevate target element above overlay for interactive steps
  const elevateElement = useCallback((element: HTMLElement, tourStep: TourStep) => {
    cleanupElevation();
    
    if (tourStep.interactive) {
      element.style.position = 'relative';
      element.style.zIndex = '101';
      elevatedElementsRef.current.push(element);

      if (tourStep.elevateParent) {
        // Walk up to find a meaningful container (the Card or similar)
        let parent = element.parentElement;
        let depth = 0;
        while (parent && depth < 8) {
          // Stop at the session-focus-card or card-level container
          if (parent.classList.contains('session-focus-card') || parent.tagName === 'MAIN') break;
          parent.style.position = 'relative';
          parent.style.zIndex = '101';
          elevatedElementsRef.current.push(parent);
          parent = parent.parentElement;
          depth++;
        }
      }
    } else if (tourStep.elevateParent) {
      // For informational steps inside clipped containers, still elevate parents
      // so the element is visible above the overlay
      element.style.position = 'relative';
      element.style.zIndex = '101';
      elevatedElementsRef.current.push(element);
      let parent = element.parentElement;
      let depth = 0;
      while (parent && depth < 8) {
        if (parent.classList.contains('session-focus-card') || parent.tagName === 'MAIN') break;
        parent.style.position = 'relative';
        parent.style.zIndex = '101';
        elevatedElementsRef.current.push(parent);
        parent = parent.parentElement;
        depth++;
      }
    }
  }, [cleanupElevation]);

  const updateTargetRect = useCallback(() => {
    if (currentTourStep) {
      const element = document.querySelector(currentTourStep.targetSelector) as HTMLElement | null;
      if (element) {
        const rect = element.getBoundingClientRect();
        setTargetRect(rect);
        elevateElement(element, currentTourStep);
        return true;
      }
    }
    return false;
  }, [currentTourStep, elevateElement]);

  const forceScrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);

  // Main effect: find element, watch for changes, handle waits
  useEffect(() => {
    clearScrollState('index-timeline');
    clearScrollState('index-feed');

    if (isFinalStep) {
      cleanupElevation();
      if (location.pathname !== '/') {
        navigate('/');
      }
      forceScrollToTop();
      setTimeout(forceScrollToTop, 50);
      setTimeout(forceScrollToTop, 150);
      setTargetRect(null);
      return;
    }

    if (!currentTourStep) return;

    // Ensure we're on home page for all steps
    if (location.pathname !== '/') {
      navigate('/');
    }

    setIsAnimating(true);

    let resizeObserver: ResizeObserver | null = null;
    let waitObserver: MutationObserver | null = null;
    let retryCount = 0;
    const maxRetries = 50; // 5 seconds max

    const findElement = () => {
      forceScrollToTop();
      const found = updateTargetRect();
      if (found) {
        setTimeout(() => setIsAnimating(false), 300);

        // Re-measure after layout settles
        setTimeout(() => { forceScrollToTop(); updateTargetRect(); }, 200);
        setTimeout(() => { forceScrollToTop(); updateTargetRect(); }, 500);

        const el = document.querySelector(currentTourStep.targetSelector);
        if (el) {
          resizeObserver = new ResizeObserver(() => updateTargetRect());
          resizeObserver.observe(el);
        }

        // For interactive steps, watch for the waitFor condition
        if (currentTourStep.interactive && (currentTourStep.waitForSelector || currentTourStep.waitForRemoval)) {
          waitObserver = new MutationObserver(() => {
            if (currentTourStep.waitForSelector) {
              const target = document.querySelector(currentTourStep.waitForSelector);
              if (target) {
                waitObserver?.disconnect();
                // Small delay to let UI settle
                setTimeout(() => {
                  cleanupElevation();
                  onNext();
                }, 400);
              }
            }
            if (currentTourStep.waitForRemoval) {
              const target = document.querySelector(currentTourStep.waitForRemoval);
              if (!target) {
                waitObserver?.disconnect();
                setTimeout(() => {
                  cleanupElevation();
                  onNext();
                }, 400);
              }
            }
          });
          waitObserver.observe(document.body, { childList: true, subtree: true, attributes: true });
        }
      } else if (retryCount < maxRetries) {
        retryCount++;
        setTimeout(findElement, 100);
      }
    };

    forceScrollToTop();
    requestAnimationFrame(() => {
      forceScrollToTop();
      setTimeout(findElement, 150);
    });

    window.addEventListener('scroll', updateTargetRect, true);
    window.addEventListener('resize', updateTargetRect);

    return () => {
      window.removeEventListener('scroll', updateTargetRect, true);
      window.removeEventListener('resize', updateTargetRect);
      resizeObserver?.disconnect();
      waitObserver?.disconnect();
    };
  }, [step, isFinalStep, currentTourStep, location.pathname, navigate, updateTargetRect, forceScrollToTop, cleanupElevation, onNext]);

  // Cleanup elevation on unmount
  useEffect(() => {
    return () => cleanupElevation();
  }, [cleanupElevation]);

  const handleOverlayClick = () => {
    if (isFadingOut) return;
    // For interactive steps, don't advance on overlay click
    if (currentTourStep?.interactive) return;
    
    setIsFadingOut(true);
    setTimeout(() => {
      setIsFadingOut(false);
      if (isFinalStep) {
        onComplete();
      } else {
        cleanupElevation();
        onNext();
      }
    }, 250);
  };

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

  // For the save-session step (step 10), render a lighter overlay since the dialog handles its own
  const isSaveDialogStep = currentTourStep?.targetSelector === '[data-tour="save-session-btn"]';

  const content = (
    <div
      className="fixed inset-0 z-[100]"
      onClick={handleOverlayClick}
      style={{ pointerEvents: currentTourStep?.interactive ? 'none' : 'auto' }}
    >
      {/* Overlay with spotlight cutout */}
      {targetRect && !isFinalStep ? (
        <>
          <svg className="fixed inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
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
              fill={isSaveDialogStep ? "rgba(0, 0, 0, 0.4)" : "rgba(0, 0, 0, 0.8)"}
              mask="url(#spotlight-mask)"
              style={{ transition: 'opacity 400ms cubic-bezier(0.4, 0, 0.2, 1)' }}
            />
          </svg>
          {/* Overlay click catcher for non-interactive steps */}
          {!currentTourStep?.interactive && (
            <div
              className="fixed inset-0"
              style={{ pointerEvents: 'auto' }}
              onClick={handleOverlayClick}
            />
          )}
        </>
      ) : (
        <div className="fixed inset-0 bg-black/80" style={{ pointerEvents: 'auto' }} onClick={handleOverlayClick} />
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
            opacity: (isAnimating || isFadingOut) ? 0 : 1,
            transform: (isAnimating || isFadingOut) ? 'scale(0.95)' : 'scale(1)',
            zIndex: 102,
          }}
        />
      )}

      {/* Tooltip / Message */}
      {isFinalStep ? (
        <div
          className="fixed inset-0 flex flex-col items-center justify-center px-8 text-center"
          style={{
            transition: 'opacity 250ms ease-in-out',
            opacity: isFadingOut ? 0 : 1,
            pointerEvents: 'auto',
          }}
          onClick={handleOverlayClick}
        >
          <div className="animate-scale-in">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-primary mb-6">
              <Music className="w-8 h-8 text-primary-foreground" />
            </div>
            <p className="text-2xl font-semibold text-foreground mb-4">
              Happy practicing!
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
          className="fixed max-w-xs px-4 py-3 bg-card border border-border rounded-xl shadow-lg pointer-events-none"
          style={{
            ...getTooltipStyle(),
            transition: 'all 400ms cubic-bezier(0.4, 0, 0.2, 1)',
            opacity: (isAnimating || isFadingOut) ? 0 : 1,
            transform: `translateX(-50%) ${isAnimating ? 'translateY(8px)' : 'translateY(0)'}`,
            zIndex: 103,
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
          <p className="text-xs text-muted-foreground/60 text-center mt-2">
            {currentTourStep.interactive ? 'Tap the highlighted area' : 'Tap anywhere to continue'}
          </p>
        </div>
      )}

      {/* Step indicator */}
      {!isFinalStep && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 pointer-events-none" style={{ zIndex: 103 }}>
          {tourSteps.map((_, i) => (
            <div
              key={i}
              className={cn(
                'w-2 h-2 rounded-full transition-colors duration-300',
                i + 1 === step ? 'bg-primary' : i + 1 < step ? 'bg-primary/40' : 'bg-muted-foreground/40'
              )}
            />
          ))}
        </div>
      )}
    </div>
  );

  return createPortal(content, document.body);
}
