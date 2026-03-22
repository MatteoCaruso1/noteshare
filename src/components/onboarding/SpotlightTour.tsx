import { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { Music } from 'lucide-react';
import { clearScrollState } from '@/hooks/useScrollRestoration';

interface TourStep {
  targetSelector: string;
  message: string;
  subMessage?: string;
  position?: 'top' | 'bottom';
  interactive?: boolean;
  waitForSelector?: string;
  waitForRemoval?: string;
  elevateParent?: boolean;
  excludeBottomNav?: boolean;
  instantEntry?: boolean;
  measureSelector?: string;
}

interface ResolvedTourTarget {
  targetElement: HTMLElement;
  measureElement: HTMLElement;
}

const tourSteps: TourStep[] = [
  {
    targetSelector: '[data-tour="practice-start-btn"]',
    message: 'Start practice sessions here',
    position: 'bottom',
  },
  {
    targetSelector: '[data-tour="practice-board"]',
    message: 'Your daily practice to-do list',
    position: 'bottom',
  },
  {
    targetSelector: '[data-tour="timeline"]',
    message: 'Your practice history lives here',
    position: 'top',
    excludeBottomNav: true,
  },
  {
    targetSelector: '[data-tour="practice-start-btn"]',
    message: 'Tap to open!',
    position: 'bottom',
    interactive: true,
    waitForSelector: '[data-tour="start-live-btn"]',
    elevateParent: true,
  },
  {
    targetSelector: '[data-tour="start-live-btn"]',
    message: 'Start a live session!',
    position: 'bottom',
    interactive: true,
    waitForSelector: '[data-tour="session-textarea"]',
    elevateParent: true,
    instantEntry: true,
  },
  {
    targetSelector: '[data-tour="session-textarea"]',
    measureSelector: 'textarea',
    message: 'You can write what you\'re practicing',
    position: 'bottom',
    elevateParent: true,
  },
  {
    targetSelector: '[data-tour="audio-recorder"]',
    message: 'Record audio and video clips',
    position: 'top',
    elevateParent: true,
  },
  {
    targetSelector: '[data-tour="link-to-list"]',
    message: 'Link to your Practice Routine',
    position: 'top',
    elevateParent: true,
  },
  {
    targetSelector: '[data-tour="end-session-btn"]',
    message: 'Tap to save your session!',
    position: 'top',
    interactive: true,
    waitForSelector: '[data-tour="save-session-btn"]',
    elevateParent: true,
  },
  {
    targetSelector: '[data-tour="save-session-btn"]',
    message: 'Review and save!',
    position: 'top',
    interactive: true,
    waitForRemoval: '[data-tour="save-session-btn"]',
  },
];

const FINAL_STEP = tourSteps.length + 1;
const TRANSITION_DURATION = 350;
const EASE = 'cubic-bezier(0.4, 0, 0.2, 1)';

interface SpotlightTourProps {
  step: number;
  onNext: () => void;
  onComplete: () => void;
}

export function SpotlightTour({ step, onNext, onComplete }: SpotlightTourProps) {
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const overlayRef = useRef<HTMLDivElement>(null);
  const elevatedElementsRef = useRef<HTMLElement[]>([]);
  const onNextRef = useRef(onNext);
  const onCompleteRef = useRef(onComplete);

  onNextRef.current = onNext;
  onCompleteRef.current = onComplete;

  const isFinalStep = step === FINAL_STEP;
  const currentTourStep = !isFinalStep && step >= 1 && step <= tourSteps.length
    ? tourSteps[step - 1]
    : null;

  const cleanupElevation = useCallback(() => {
    elevatedElementsRef.current.forEach((el) => {
      el.style.removeProperty('position');
      el.style.removeProperty('z-index');
      el.style.removeProperty('pointer-events');
    });
    elevatedElementsRef.current = [];
  }, []);

  const elevateElement = useCallback((element: HTMLElement, tourStep: TourStep) => {
    cleanupElevation();
    const shouldElevate = tourStep.interactive || tourStep.elevateParent;
    if (!shouldElevate) return;

    element.style.position = 'relative';
    element.style.zIndex = '101';
    if (tourStep.interactive) {
      element.style.pointerEvents = 'auto';
    }
    elevatedElementsRef.current.push(element);

    if (tourStep.elevateParent) {
      let parent = element.parentElement;
      let depth = 0;
      while (parent && depth < 8) {
        if (parent.classList.contains('session-focus-card') || parent.tagName === 'MAIN') break;
        parent.style.position = 'relative';
        parent.style.zIndex = '101';
        if (tourStep.interactive) {
          parent.style.pointerEvents = 'none';
        }
        elevatedElementsRef.current.push(parent);
        parent = parent.parentElement;
        depth++;
      }

      if (parent && parent.classList.contains('session-focus-card')) {
        parent.style.position = 'relative';
        parent.style.zIndex = '101';
        if (tourStep.interactive) {
          parent.style.pointerEvents = 'none';
        }
        elevatedElementsRef.current.push(parent);
      }
    }
  }, [cleanupElevation]);

  const resolveTarget = useCallback((tourStep: TourStep): ResolvedTourTarget | null => {
    const targetElement = document.querySelector(tourStep.targetSelector) as HTMLElement | null;
    if (!targetElement) return null;

    if (tourStep.measureSelector) {
      const measureElement = targetElement.querySelector(tourStep.measureSelector) as HTMLElement | null;
      if (!measureElement) return null;
      return { targetElement, measureElement };
    }

    return { targetElement, measureElement: targetElement };
  }, []);

  const getRectForStep = useCallback((tourStep: TourStep): DOMRect | null => {
    const resolved = resolveTarget(tourStep);
    if (!resolved) return null;

    // Use getBoundingClientRect directly — all spotlight elements (SVG, border, tooltip)
    // are fixed-positioned, so viewport coordinates are correct. No overlay-relative
    // normalization needed (which caused mobile Safari offset bugs).
    const r = resolved.measureElement.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return null;

    let left = r.left;
    let top = r.top;
    let width = r.width;
    let height = r.height;

    if (tourStep.excludeBottomNav) {
      const bottomNav = document.querySelector('[data-tour="bottom-nav"]') as HTMLElement | null;
      if (bottomNav) {
        const navTop = bottomNav.getBoundingClientRect().top;
        height = Math.max(0, navTop - top);
      }
    }

    left = Math.max(0, left);
    top = Math.max(0, top);

    return new DOMRect(left, top, width, height);
  }, [resolveTarget]);

  const forceScrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, []);

  // On mobile Safari the visual viewport isn't settled until the first scroll
  // event. Force a micro-scroll (1px down then back) so the browser recalculates
  // its viewport metrics, making getBoundingClientRect return correct values.
  const forceViewportSettle = useCallback(() => {
    return new Promise<void>((resolve) => {
      window.scrollTo({ top: 1, left: 0, behavior: 'auto' });
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        // Give the browser one more frame to settle
        requestAnimationFrame(() => resolve());
      });
    });
  }, []);

  useEffect(() => {
    clearScrollState('index-timeline');
    clearScrollState('index-feed');

    if (isFinalStep) {
      cleanupElevation();
      setTooltipVisible(false);
      if (location.pathname !== '/') navigate('/');
      forceScrollToTop();
      setTimeout(forceScrollToTop, 50);
      setTargetRect(null);
      return;
    }

    if (!currentTourStep) return;
    if (location.pathname !== '/') navigate('/');

    setTooltipVisible(false);

    let resizeObserver: ResizeObserver | null = null;
    let waitObserver: MutationObserver | null = null;
    let retryTimeout: ReturnType<typeof setTimeout> | null = null;
    let tooltipTimeout: ReturnType<typeof setTimeout> | null = null;
    let startDelayTimeout: ReturnType<typeof setTimeout> | null = null;
    let settleRafId: number | null = null;
    let retryCount = 0;
    const maxRetries = 50;
    let cancelled = false;

    const measureCurrentStep = () => {
      if (cancelled) return null;
      const rect = getRectForStep(currentTourStep);
      if (rect) {
        setTargetRect(rect);
      }
      return rect;
    };

    const settleMeasurement = (frames = 6) => {
      let remaining = frames;

      const tick = () => {
        if (cancelled || remaining <= 0) return;
        measureCurrentStep();
        remaining -= 1;
        if (remaining > 0) {
          settleRafId = requestAnimationFrame(tick);
        }
      };

      settleRafId = requestAnimationFrame(tick);
    };

    const installWaitObserver = () => {
      if (!currentTourStep.interactive || (!currentTourStep.waitForSelector && !currentTourStep.waitForRemoval)) {
        return;
      }

      waitObserver = new MutationObserver(() => {
        if (cancelled) return;

        if (currentTourStep.waitForSelector && document.querySelector(currentTourStep.waitForSelector)) {
          waitObserver?.disconnect();
          const nextStep = tourSteps[step];
          const advanceDelay = nextStep?.instantEntry ? 0 : 300;
          setTimeout(() => {
            if (!cancelled) {
              cleanupElevation();
              onNextRef.current();
            }
          }, advanceDelay);
          return;
        }

        if (currentTourStep.waitForRemoval && !document.querySelector(currentTourStep.waitForRemoval)) {
          waitObserver?.disconnect();
          setTimeout(() => {
            if (!cancelled) {
              cleanupElevation();
              onNextRef.current();
            }
          }, 300);
        }
      });

      waitObserver.observe(document.body, { childList: true, subtree: true, attributes: true });
    };

    const findAndHighlight = () => {
      if (cancelled) return;

      forceScrollToTop();

      const resolved = resolveTarget(currentTourStep);
      const rect = measureCurrentStep();

      if (!resolved || !rect) {
        if (retryCount < maxRetries) {
          retryCount += 1;
          retryTimeout = setTimeout(findAndHighlight, 100);
        }
        return;
      }

      elevateElement(resolved.targetElement, currentTourStep);

      resizeObserver = new ResizeObserver(() => {
        if (!cancelled) {
          measureCurrentStep();
        }
      });
      resizeObserver.observe(resolved.targetElement);
      if (resolved.measureElement !== resolved.targetElement) {
        resizeObserver.observe(resolved.measureElement);
      }

      installWaitObserver();

      const tooltipDelay = currentTourStep.instantEntry ? 0 : TRANSITION_DURATION + 50;
      tooltipTimeout = setTimeout(() => {
        if (cancelled) return;
        measureCurrentStep();
        settleMeasurement(currentTourStep.instantEntry ? 2 : 6);
        setTooltipVisible(true);
      }, tooltipDelay);
    };

    const handleViewportChange = () => {
      if (cancelled) return;
      measureCurrentStep();
      settleMeasurement(2);
    };

    forceScrollToTop();
    const entryDelay = currentTourStep.instantEntry ? 0 : 120;
    startDelayTimeout = setTimeout(() => {
      if (!cancelled) {
        findAndHighlight();
      }
    }, entryDelay);

    window.addEventListener('scroll', handleViewportChange, true);
    window.addEventListener('resize', handleViewportChange);
    window.visualViewport?.addEventListener('resize', handleViewportChange);
    window.visualViewport?.addEventListener('scroll', handleViewportChange);

    return () => {
      cancelled = true;
      if (retryTimeout) clearTimeout(retryTimeout);
      if (tooltipTimeout) clearTimeout(tooltipTimeout);
      if (startDelayTimeout) clearTimeout(startDelayTimeout);
      if (settleRafId !== null) cancelAnimationFrame(settleRafId);
      window.removeEventListener('scroll', handleViewportChange, true);
      window.removeEventListener('resize', handleViewportChange);
      window.visualViewport?.removeEventListener('resize', handleViewportChange);
      window.visualViewport?.removeEventListener('scroll', handleViewportChange);
      resizeObserver?.disconnect();
      waitObserver?.disconnect();
    };
  }, [step, isFinalStep, currentTourStep, location.pathname, navigate, getRectForStep, resolveTarget, forceScrollToTop, cleanupElevation, elevateElement]);

  useEffect(() => {
    return () => cleanupElevation();
  }, [cleanupElevation]);

  const handleOverlayClick = () => {
    if (isFadingOut) return;
    if (currentTourStep?.interactive) return;

    setIsFadingOut(true);
    setTooltipVisible(false);
    setTimeout(() => {
      setIsFadingOut(false);
      if (isFinalStep) {
        forceScrollToTop();
        clearScrollState('index-timeline');
        clearScrollState('index-feed');
        onCompleteRef.current();
      } else {
        cleanupElevation();
        onNextRef.current();
      }
    }, 250);
  };

  const getTooltipStyle = (): React.CSSProperties => {
    if (!targetRect || !currentTourStep) return { top: '40%', left: '50%', transform: 'translateX(-50%)' };

    const padding = 14;
    const position = currentTourStep.position || 'bottom';

    if (position === 'top') {
      return {
        bottom: window.innerHeight - targetRect.top + padding,
        left: '50%',
        transform: 'translateX(-50%)',
      };
    }

    return {
      top: targetRect.bottom + padding,
      left: '50%',
      transform: 'translateX(-50%)',
    };
  };

  const isSaveDialogStep = currentTourStep?.targetSelector === '[data-tour="save-session-btn"]';
  const isInteractive = currentTourStep?.interactive;
  const transStyle = `all ${TRANSITION_DURATION}ms ${EASE}`;

  const content = (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100]"
      style={{ pointerEvents: isInteractive ? 'none' : 'auto' }}
      onClick={handleOverlayClick}
    >
      {!isFinalStep ? (
        targetRect ? (
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
                  style={{ transition: transStyle }}
                />
              </mask>
            </defs>
            <rect
              x="0"
              y="0"
              width="100%"
              height="100%"
              fill={isSaveDialogStep ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.75)'}
              mask="url(#spotlight-mask)"
              style={{ transition: `fill ${TRANSITION_DURATION}ms ${EASE}` }}
            />
          </svg>
        ) : (
          <div className="fixed inset-0 bg-black/75 transition-opacity duration-300" />
        )
      ) : (
        <div className="fixed inset-0 bg-background transition-opacity duration-300" />
      )}

      {targetRect && !isFinalStep && (
        <div
          className="fixed rounded-xl border-2 border-primary/80 pointer-events-none"
          style={{
            left: targetRect.left - 8,
            top: targetRect.top - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
            transition: transStyle,
            opacity: isFadingOut ? 0 : 1,
            zIndex: 102,
          }}
        />
      )}

      {isFinalStep ? (
        <div
          className="fixed inset-0 flex flex-col items-center justify-center px-8 text-center bg-background z-[104]"
          style={{
            transition: 'opacity 300ms ease',
            opacity: isFadingOut ? 0 : 1,
          }}
        >
          <div className="animate-scale-in">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-primary mb-6">
              <Music className="w-8 h-8 text-primary-foreground" />
            </div>
            <p className="text-2xl font-semibold text-foreground mb-4">
              Happy practicing!
            </p>
            <p className="text-base text-foreground/80 font-medium mb-8">
              Stay disciplined with these tools and I promise you'll see significant growth
            </p>
            <p className="text-sm text-muted-foreground/60">
              Tap anywhere to continue
            </p>
          </div>
        </div>
      ) : currentTourStep && (
        <div
          className="fixed max-w-[260px] px-4 py-3 bg-card/95 backdrop-blur-sm border border-border rounded-xl shadow-lg pointer-events-none"
          style={{
            ...getTooltipStyle(),
            transition: `opacity ${TRANSITION_DURATION}ms ease, transform ${TRANSITION_DURATION}ms ${EASE}`,
            opacity: tooltipVisible && !isFadingOut ? 1 : 0,
            transform: `translateX(-50%) translateY(${tooltipVisible && !isFadingOut ? '0' : '6px'})`,
            zIndex: 103,
          }}
        >
          <p className="text-sm text-foreground text-center font-medium leading-snug">
            {currentTourStep.message}
          </p>
          {currentTourStep.subMessage && (
            <p className="text-xs text-muted-foreground text-center mt-1 leading-snug">
              {currentTourStep.subMessage}
            </p>
          )}
          {!currentTourStep.interactive && (
            <p className="text-[11px] text-muted-foreground/50 text-center mt-1.5">
              Tap to continue
            </p>
          )}
        </div>
      )}
    </div>
  );

  return createPortal(content, document.body);
}
