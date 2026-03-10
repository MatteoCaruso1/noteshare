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
  },
  {
    targetSelector: '[data-tour="session-textarea"]',
    message: 'Write what you\'re practicing',
    position: 'bottom',
    elevateParent: true,
  },
  {
    targetSelector: '[data-tour="audio-recorder"]',
    message: 'Record audio clips',
    position: 'top',
    elevateParent: true,
  },
  {
    targetSelector: '[data-tour="link-to-list"]',
    message: 'Link to your Practice List',
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
    elevatedElementsRef.current.forEach(el => {
      el.style.removeProperty('position');
      el.style.removeProperty('z-index');
    });
    elevatedElementsRef.current = [];
  }, []);

  const elevateElement = useCallback((element: HTMLElement, tourStep: TourStep) => {
    cleanupElevation();
    const shouldElevate = tourStep.interactive || tourStep.elevateParent;
    if (!shouldElevate) return;

    element.style.position = 'relative';
    element.style.zIndex = '101';
    elevatedElementsRef.current.push(element);

    if (tourStep.elevateParent) {
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
      if (parent && parent.classList.contains('session-focus-card')) {
        parent.style.position = 'relative';
        parent.style.zIndex = '101';
        elevatedElementsRef.current.push(parent);
      }
    }
  }, [cleanupElevation]);

  const getRectForStep = useCallback((tourStep: TourStep): DOMRect | null => {
    const element = document.querySelector(tourStep.targetSelector) as HTMLElement | null;
    if (!element) return null;
    let rect = element.getBoundingClientRect();
    if (tourStep.excludeBottomNav) {
      const bottomNav = document.querySelector('[data-tour="bottom-nav"]') as HTMLElement | null;
      if (bottomNav) {
        const navTop = bottomNav.getBoundingClientRect().top;
        rect = new DOMRect(rect.left, rect.top, rect.width, Math.max(0, navTop - rect.top));
      }
    }
    return rect;
  }, []);

  const forceScrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
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

    // Phase 1: fade out tooltip
    setTooltipVisible(false);

    let resizeObserver: ResizeObserver | null = null;
    let waitObserver: MutationObserver | null = null;
    let retryCount = 0;
    const maxRetries = 50;
    let cancelled = false;

    const findAndHighlight = () => {
      if (cancelled) return;
      forceScrollToTop();
      const rect = getRectForStep(currentTourStep);
      if (rect) {
        const element = document.querySelector(currentTourStep.targetSelector) as HTMLElement;
        if (element) elevateElement(element, currentTourStep);

        // Update rect — CSS transition on the highlight handles smooth movement
        setTargetRect(rect);

        // Phase 2: fade in tooltip after highlight has moved
        setTimeout(() => {
          if (!cancelled) {
            forceScrollToTop();
            // Re-measure after scroll
            const freshRect = getRectForStep(currentTourStep);
            if (freshRect) setTargetRect(freshRect);
            setTooltipVisible(true);
          }
        }, TRANSITION_DURATION + 50);

        // Keep position accurate
        const el = document.querySelector(currentTourStep.targetSelector);
        if (el) {
          resizeObserver = new ResizeObserver(() => {
            if (!cancelled) {
              const r = getRectForStep(currentTourStep);
              if (r) setTargetRect(r);
            }
          });
          resizeObserver.observe(el);
        }

        // Interactive step watchers
        if (currentTourStep.interactive && (currentTourStep.waitForSelector || currentTourStep.waitForRemoval)) {
          waitObserver = new MutationObserver(() => {
            if (cancelled) return;
            if (currentTourStep.waitForSelector && document.querySelector(currentTourStep.waitForSelector)) {
              waitObserver?.disconnect();
              setTimeout(() => { if (!cancelled) { cleanupElevation(); onNextRef.current(); } }, 300);
            }
            if (currentTourStep.waitForRemoval && !document.querySelector(currentTourStep.waitForRemoval)) {
              waitObserver?.disconnect();
              setTimeout(() => { if (!cancelled) { cleanupElevation(); onNextRef.current(); } }, 300);
            }
          });
          waitObserver.observe(document.body, { childList: true, subtree: true, attributes: true });
        }
      } else if (retryCount < maxRetries) {
        retryCount++;
        setTimeout(findAndHighlight, 100);
      }
    };

    forceScrollToTop();
    // Small delay to let fade-out complete before moving highlight
    const startDelay = setTimeout(() => {
      if (!cancelled) findAndHighlight();
    }, 120);

    const handleScroll = () => {
      if (!cancelled && currentTourStep) {
        const r = getRectForStep(currentTourStep);
        if (r) setTargetRect(r);
      }
    };
    const handleResize = handleScroll;
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);

    return () => {
      cancelled = true;
      clearTimeout(startDelay);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
      resizeObserver?.disconnect();
      waitObserver?.disconnect();
    };
  }, [step, isFinalStep, currentTourStep, location.pathname, navigate, getRectForStep, forceScrollToTop, cleanupElevation, elevateElement]);

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
      className="fixed inset-0 z-[100]"
      style={{ pointerEvents: isInteractive ? 'none' : 'auto' }}
      onClick={handleOverlayClick}
    >
      {/* Dark overlay */}
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
              x="0" y="0" width="100%" height="100%"
              fill={isSaveDialogStep ? "rgba(0,0,0,0.4)" : "rgba(0,0,0,0.75)"}
              mask="url(#spotlight-mask)"
              style={{ transition: `fill ${TRANSITION_DURATION}ms ${EASE}` }}
            />
          </svg>
        ) : (
          <div className="fixed inset-0 bg-black/75 transition-opacity duration-300" />
        )
      ) : (
        <div className="fixed inset-0 bg-black/75 transition-opacity duration-300" />
      )}

      {/* Highlight border */}
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

      {/* Tooltip */}
      {isFinalStep ? (
        <div
          className="fixed inset-0 flex flex-col items-center justify-center px-8 text-center"
          style={{
            transition: `opacity 300ms ease`,
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
            <p className="text-base text-muted-foreground mb-8">
              Explore everything Noteshare has to offer
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
            opacity: (tooltipVisible && !isFadingOut) ? 1 : 0,
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
