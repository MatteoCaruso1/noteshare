import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Music, ChevronRight, ChevronLeft, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useFTUEState, clearFTUEState, getFTUEState } from '@/hooks/useFTUEState';
import { INSTRUMENTS } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { startGoogleOAuth } from '@/lib/oauth';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

// Real components
import { PracticeControls } from '@/components/PracticeControls';
import { QuickNoteCapture } from '@/components/QuickNoteCapture';
import { TodaysFocus } from '@/components/TodaysFocus';
import { Timeline } from '@/components/Timeline';
import { GlintProvider } from '@/contexts/GlintContext';
import { FTUEPreviewProvider, useFTUEPreview } from '@/contexts/FTUEPreviewContext';

// Step 0: Welcome
// Step 1: Name (intro)
// Step 2: Choose instruments
// Step 3: Interactive app walkthrough (practice session flow) — real components
// Step 4: Create account (only after session saved in tour)
// Step 5: Final "Happy practicing!" celebration

const SIGNUP_STEP = 4;

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

// ─── Interactive Tour (using real components) ──────────────────────
// Phase 0: Highlight practice button → "Start practice sessions here"
// Phase 1: Highlight quick note → "Capture quick notes anytime"
// Phase 2: Highlight routine → "Your daily practice to-do list"
// Phase 3: Highlight timeline → "Your practice history lives here"
// Phase 4: "Now let's try it! Tap to open" → user taps collapsible trigger
// Phase 5: Spotlight "Start Live Session" button → user taps it
// Phase 6: Active session shown, highlight notes area
// Phase 7: Highlight end session → user taps it
// Phase 8: EndSessionDialog shown (no spotlight)
// Phase 9: Session saved! Note in timeline → Continue to create account

type TourPhase = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

interface SpotlightTarget {
  label: string;
  subLabel?: string;
  targetSelector: string;
  position: 'top' | 'bottom';
  ctaText?: string;
  autoAdvance?: boolean;
}

const SPOTLIGHT_PHASES: Record<number, SpotlightTarget> = {
  0: { label: 'Start practice sessions here', subLabel: 'Track your playing in real-time', targetSelector: '[data-tour="practice-start-btn"]', position: 'bottom' },
  1: { label: 'Capture quick notes anytime', subLabel: 'Ideas, recordings, images', targetSelector: '[data-tour="quick-note-trigger"]', position: 'bottom' },
  2: { label: 'Your daily practice to-do list', subLabel: 'Stay organized and focused', targetSelector: '[data-tour="practice-routine"]', position: 'bottom' },
  3: { label: 'Your practice history lives here', subLabel: 'Every session saved and searchable', targetSelector: '[data-tour="timeline"]', position: 'top' },
  4: { label: "Now let's try it!", subLabel: 'Tap to open the practice menu', targetSelector: '[data-tour="practice-start-btn"]', position: 'bottom', autoAdvance: true },
  5: { label: 'Start a live session', subLabel: 'Tap to begin practicing', targetSelector: '[data-tour="start-live-btn"]', position: 'bottom', autoAdvance: true },
  6: { label: 'Add notes during your session', subLabel: 'Write what you practiced', targetSelector: '[data-tour="session-textarea"]', position: 'bottom' },
  7: { label: 'Save your session when done', subLabel: 'Tap to finish practicing', targetSelector: '[data-tour="end-session-btn"]', position: 'top', autoAdvance: true },
  9: { label: 'Your first practice note! 🎉', targetSelector: '[data-tour="timeline"]', position: 'top', ctaText: 'Create an account to save your practice' },
};

/** Inner component that reads FTUE preview context for phase syncing */
function FTUETourContent({ onComplete }: { onComplete: () => void }) {
  const ftuePreview = useFTUEPreview();
  const [phase, setPhase] = useState<TourPhase>(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const hasCompletedRef = useRef(false);

  const currentSpotlight = SPOTLIGHT_PHASES[phase];

  // Phase 4→5: after user taps collapsible trigger, wait for start-live-btn to appear
  useEffect(() => {
    if (phase !== 4) return;
    const interval = setInterval(() => {
      const el = document.querySelector('[data-tour="start-live-btn"]');
      if (el) {
        clearInterval(interval);
        setPhase(5);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [phase]);

  // Phase 5→6: when session becomes active (user tapped Start Live Session)
  useEffect(() => {
    if (ftuePreview.sessionActive && phase === 5) {
      setPhase(6);
    }
  }, [ftuePreview.sessionActive, phase]);

  // When session is saved (previewNotes appear), advance to phase 9
  useEffect(() => {
    if (ftuePreview.previewNotes.length > 0 && (phase === 7 || phase === 8)) {
      setPhase(9);
    }
  }, [ftuePreview.previewNotes.length, phase]);

  // Measure target element
  useEffect(() => {
    if (!currentSpotlight) return;
    setTooltipVisible(false);
    const measure = () => {
      const el = document.querySelector(currentSpotlight.targetSelector);
      if (el) {
        setRect(el.getBoundingClientRect());
      }
    };
    measure();
    const t = setTimeout(() => {
      measure();
      setTooltipVisible(true);
    }, 300);
    return () => clearTimeout(t);
  }, [phase, currentSpotlight?.targetSelector, ftuePreview.sessionActive]);

  const handleAdvance = useCallback(() => {
    if (phase === 4) return; // user must tap collapsible trigger
    if (phase === 5) return; // user must tap Start Live Session
    if (phase === 7) return; // user must tap end session
    if (phase === 8) return; // save dialog handles it
    if (phase < 9) {
      setPhase(p => (p + 1) as TourPhase);
    } else {
      if (!hasCompletedRef.current) {
        hasCompletedRef.current = true;
        onComplete();
      }
    }
  }, [phase, onComplete]);

  // Handle clicks on spotlight overlay — pass through to interactive elements
  const handleOverlayClick = useCallback((e: React.MouseEvent) => {
    const passthrough = (selector: string) => {
      const el = document.querySelector(selector) as HTMLElement;
      if (el) {
        const r = el.getBoundingClientRect();
        if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) {
          el.click();
          return true;
        }
      }
      return false;
    };

    if (phase === 4) {
      passthrough('[data-tour="practice-start-btn"]');
      return;
    }
    if (phase === 5) {
      passthrough('[data-tour="start-live-btn"]');
      return;
    }
    if (phase === 7) {
      passthrough('[data-tour="end-session-btn"]');
      return;
    }
  }, [phase]);
  const tooltipStyle = (): React.CSSProperties => {
    if (!rect) return { top: '40%', left: '50%', transform: 'translateX(-50%)' };
    if (currentSpotlight?.position === 'top') {
      return {
        bottom: window.innerHeight - rect.top + 14,
        left: '50%',
        transform: 'translateX(-50%)',
      };
    }
    return {
      top: rect.bottom + 14,
      left: '50%',
      transform: 'translateX(-50%)',
    };
  };

  // Don't show spotlight overlay during save dialog (phase 8)
  const showSpotlight = currentSpotlight && phase !== 8;

  return (
    <>
      {/* Real app content — actual components rendered via FTUEPreviewProvider */}
      <div className="min-h-screen bg-background pb-20">
        <div className="container max-w-2xl mx-auto px-4 py-4 space-y-4">
          <h1 className="text-lg sm:text-xl font-semibold">My Practice</h1>

          <GlintProvider>
            <section className="space-y-4">
              {/* Real Practice Controls */}
              <div data-tour="practice-capture" className="relative">
                <PracticeControls />
              </div>

              {/* Real Quick Note Capture — hidden during active session like in real app */}
              {!ftuePreview.sessionActive && (
                <div data-tour="quick-note-trigger">
                  <QuickNoteCapture />
                </div>
              )}

              {/* Real Practice Routine */}
              {!ftuePreview.sessionActive && (
                <div data-tour="practice-routine">
                  <TodaysFocus />
                </div>
              )}
            </section>
          </GlintProvider>

          {/* Timeline */}
          <section data-tour="timeline">
            <div className="relative px-3 sm:px-4 border border-border rounded-lg bg-card z-10">
              <div className="flex items-center gap-2 sm:gap-4 py-3">
                <h2 className="text-lg font-semibold shrink-0">Notes</h2>
              </div>
              <div className="pb-3 sm:pb-4">
                <Timeline
                  notes={ftuePreview.previewNotes}
                  loading={false}
                  displayCount={10}
                  onLoadMore={() => {}}
                />
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Spotlight overlay */}
      {showSpotlight && (
        <div
          className="fixed inset-0 z-[100]"
          style={{ pointerEvents: 'auto', touchAction: 'none' }}
          onTouchMove={(e) => e.preventDefault()}
          onClick={handleOverlayClick}
        >
          {rect && (
            <svg className="fixed inset-0 w-full h-full pointer-events-none">
              <defs>
                <mask id="ftue-spotlight-mask">
                  <rect x="0" y="0" width="100%" height="100%" fill="white" />
                  <rect
                    x={rect.left - 8}
                    y={rect.top - 8}
                    width={rect.width + 16}
                    height={rect.height + 16}
                    rx="12"
                    fill="black"
                    style={{ transition: 'all 350ms cubic-bezier(0.4, 0, 0.2, 1)' }}
                  />
                </mask>
              </defs>
              <rect
                x="0" y="0" width="100%" height="100%"
                fill="rgba(0,0,0,0.75)"
                mask="url(#ftue-spotlight-mask)"
              />
            </svg>
          )}

          {/* Spotlight border */}
          {rect && (
            <div
              className="fixed pointer-events-none rounded-xl border-2 border-primary/60"
              style={{
                left: rect.left - 8,
                top: rect.top - 8,
                width: rect.width + 16,
                height: rect.height + 16,
                transition: 'all 350ms cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            />
          )}

          {/* Tooltip */}
          <div
            className="fixed z-[110] transition-all duration-300"
            style={{
              ...tooltipStyle(),
              opacity: tooltipVisible ? 1 : 0,
              transform: `translateX(-50%) translateY(${tooltipVisible ? '0' : '8px'})`,
            }}
          >
            <div className="bg-popover border border-border rounded-xl px-5 py-3 shadow-lg text-center max-w-[280px]">
              <p className="text-foreground font-semibold text-sm">{currentSpotlight.label}</p>
              {currentSpotlight.subLabel && (
                <p className="text-muted-foreground text-xs mt-0.5">{currentSpotlight.subLabel}</p>
              )}
              {!currentSpotlight.autoAdvance && (
                <button
                  type="button"
                  onClick={handleAdvance}
                  className="text-primary text-xs mt-2 font-medium"
                >
                  {currentSpotlight.ctaText || 'Tap to continue'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function FTUEInteractiveTour({ name, onComplete }: { name: string; onComplete: () => void }) {
  return (
    <FTUEPreviewProvider name={name}>
      <FTUETourContent onComplete={onComplete} />
    </FTUEPreviewProvider>
  );
}

// ─── Commit helper ───────────────────────────────────────────────

async function commitFTUEData(retries = 3): Promise<boolean> {
  const state = getFTUEState();
  if (!state) return false;

  const idempotencyKey = `${state.startedAt}`;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.warn(`[FTUE] No session for commit (attempt ${attempt + 1})`);
        if (attempt < retries - 1) {
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
        return false;
      }

      const { data, error } = await supabase.functions.invoke('commit-ftue', {
        body: {
          name: state.name.trim(),
          instrument: state.instrument,
          instruments: state.instruments || [state.instrument],
          idempotencyKey,
        },
      });

      if (error) {
        console.warn(`[FTUE] Commit error (attempt ${attempt + 1}):`, error);
        if (attempt < retries - 1) {
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
        return false;
      }

      console.log('[FTUE] Commit success:', data);
      return true;
    } catch (err) {
      console.warn(`[FTUE] Commit exception (attempt ${attempt + 1}):`, err);
      if (attempt < retries - 1) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
      return false;
    }
  }
  return false;
}

// ─── Main FTUE Component ────────────────────────────────────────

export default function FTUE() {
  const navigate = useNavigate();
  const { user, signUp: authSignUp } = useAuth();
  const queryClient = useQueryClient();
  const ftue = useFTUEState();

  // Reset FTUE state on entry — but NOT if user is already authenticated
  // (they're returning after signup and should proceed to commit + celebration)
  const didResetRef = useRef(false);
  useEffect(() => {
    if (didResetRef.current) return;
    didResetRef.current = true;
    if (!user) {
      ftue.reset();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Signup form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [signupLoading, setSignupLoading] = useState(false);
  const [commitPending, setCommitPending] = useState(false);
  const commitAttemptedRef = useRef(false);
  const signupInitiatedRef = useRef(false);

  const hadUserOnMount = useRef(!!user);

  // After signup + auth, commit FTUE data then go to final step
  useEffect(() => {
    if (!user) return;
    if (commitAttemptedRef.current) return;

    // Only auto-commit if user explicitly started signup
    if (!signupInitiatedRef.current && !hadUserOnMount.current) return;

    const state = getFTUEState();
    // Only act when readyForSignup flag is set (user completed the interactive tour)
    if (!state || !state.readyForSignup) return;
    if (state.currentStep < SIGNUP_STEP) return;

    commitAttemptedRef.current = true;
    setCommitPending(true);

    const doCommit = async () => {
      const success = await commitFTUEData();

      if (success) {
        queryClient.invalidateQueries({ queryKey: ['sessions'] });
        queryClient.invalidateQueries({ queryKey: ['notes'] });
        queryClient.invalidateQueries({ queryKey: ['practice-stats'] });
        clearFTUEState();
      } else {
        console.warn('[FTUE] Commit failed — data preserved in localStorage for retry');
        toast.error('Your practice data will be saved shortly.');
      }

      setCommitPending(false);
      ftue.setStep(5);
    };

    doCommit();
  }, [user, navigate, queryClient, ftue]);

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setPasswordTouched(true);
      return;
    }
    signupInitiatedRef.current = true;
    setSignupLoading(true);
    try {
      await authSignUp(email, password, ftue.name.trim());
    } catch {
      // Error handled in useAuth
    } finally {
      setSignupLoading(false);
    }
  };

  const handleGoogleSignup = () => {
    signupInitiatedRef.current = true;
    setSignupLoading(true);
    startGoogleOAuth();
  };

  // Show committing state
  if (commitPending) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center animate-fade-in">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-primary mb-3">
            <Music className="w-7 h-7 text-primary-foreground" />
          </div>
          <p className="text-muted-foreground">Setting up your account...</p>
        </div>
      </div>
    );
  }

  // ── Step 0: Welcome ──
  if (ftue.currentStep === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-sm flex flex-col items-center text-center animate-fade-in">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 self-start"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
          <div className="w-32 h-32 rounded-full bg-muted/30 flex items-center justify-center mb-8">
            <div className="w-24 h-24 rounded-full bg-gradient-primary flex items-center justify-center">
              <Music className="w-12 h-12 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-3xl font-semibold text-foreground mb-2">Welcome to</h1>
          <h2 className="text-3xl font-semibold text-primary mb-6">Noteshare</h2>
          <div className="mb-12" />
          <Button
            size="lg"
            className="w-full bg-gradient-primary text-primary-foreground font-semibold px-8 py-6 text-lg"
            onClick={() => ftue.nextStep()}
          >
            Get Started
          </Button>
        </div>
      </div>
    );
  }

  // ── Step 1: Name (intro) ──
  if (ftue.currentStep === 1) {
    const trimmedName = ftue.name.trim();
    const canContinue = trimmedName.length > 0 && trimmedName.length <= 50;
    const nameTooLong = ftue.name.trim().length > 50;

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-sm flex flex-col animate-fade-in">
          <button
            type="button"
            onClick={() => ftue.prevStep()}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 self-start"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold text-foreground mb-2">What's your name?</h1>
            <p className="text-muted-foreground text-sm">This helps personalize your experience</p>
          </div>

          <div className="space-y-2">
            <Input
              placeholder="Enter your name"
              value={ftue.name}
              onChange={(e) => ftue.setName(e.target.value.slice(0, 60))}
              autoFocus
              autoComplete="off"
              maxLength={60}
              className="text-lg h-12"
            />
            {nameTooLong && (
              <p className="text-xs text-destructive text-center">Name must be 50 characters or less</p>
            )}
          </div>

          <Button
            size="lg"
            className="w-full mt-8 bg-gradient-primary text-primary-foreground font-semibold gap-2"
            disabled={!canContinue}
            onClick={() => {
              ftue.setName(ftue.name.trim());
              ftue.nextStep();
            }}
          >
            Continue
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  // ── Step 2: Choose instruments ──
  if (ftue.currentStep === 2) {
    const toggleInstrument = (inst: string) => {
      const current = ftue.instruments;
      if (current.includes(inst)) {
        ftue.setInstruments(current.filter(i => i !== inst));
      } else {
        ftue.setInstruments([...current, inst]);
      }
    };

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-sm flex flex-col animate-fade-in">
          <button
            type="button"
            onClick={() => ftue.prevStep()}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 self-start"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold text-foreground mb-2">What do you play?</h1>
            <p className="text-muted-foreground text-sm">Select all that apply</p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {INSTRUMENTS.map((inst) => (
              <button
                key={inst}
                type="button"
                onClick={() => toggleInstrument(inst)}
                className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-all border ${
                  ftue.instruments.includes(inst)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground'
                }`}
              >
                {ftue.instruments.includes(inst) && <Check className="w-3 h-3 inline mr-1" />}
                {inst}
              </button>
            ))}
          </div>

          <Button
            size="lg"
            className="w-full mt-8 bg-gradient-primary text-primary-foreground font-semibold gap-2"
            disabled={ftue.instruments.length === 0}
            onClick={() => ftue.nextStep()}
          >
            Continue
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  // ── Step 3: Interactive app tour ──
  if (ftue.currentStep === 3) {
    return (
      <FTUEInteractiveTour
        name={ftue.name}
        onComplete={() => {
          // Mark ready for signup and advance
          ftue.setReadyForSignup(true);
          ftue.nextStep();
        }}
      />
    );
  }

  // ── Step 4: Create account (only reached after interactive tour completes) ──
  if (ftue.currentStep === 4) {
    const isPasswordValid = password.length >= 6;
    const showPasswordHint = passwordTouched && !isPasswordValid && password.length > 0;

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-sm flex flex-col items-center text-center animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-gradient-primary flex items-center justify-center mb-6">
            <Music className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-semibold text-foreground mb-2">Create your account</h1>
          <p className="text-muted-foreground text-sm leading-relaxed mb-6">
            Sign up to save your practice and keep going
          </p>

          <div className="w-full space-y-3">
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              style={{ backgroundColor: '#ffffff', color: '#18181b', borderColor: '#d4d4d8' }}
              onClick={handleGoogleSignup}
              disabled={signupLoading}
            >
              <GoogleIcon />
              Continue with Google
            </Button>

            <div className="flex items-center gap-2 my-2">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <form onSubmit={handleEmailSignup} noValidate className="space-y-3">
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                name="email"
              />
              <div className="space-y-1">
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => setPasswordTouched(true)}
                  required
                  autoComplete="new-password"
                  name="password"
                  className={showPasswordHint ? 'border-destructive focus-visible:ring-destructive' : ''}
                />
                {showPasswordHint && (
                  <p className="text-xs text-destructive flex items-center gap-1 px-1">
                    <AlertCircle className="w-3 h-3 flex-shrink-0" />
                    <span>Password must be at least 6 characters</span>
                  </p>
                )}
              </div>
              <Button
                type="submit"
                className="w-full bg-gradient-primary text-primary-foreground font-semibold"
                disabled={signupLoading}
              >
                {signupLoading ? 'Creating account...' : 'Create Account'}
              </Button>
            </form>

            <button
              type="button"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors mt-2"
              onClick={() => {
                clearFTUEState();
                navigate('/auth?mode=login');
              }}
            >
              I already have an account
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Step 5: Final celebration ──
  if (ftue.currentStep === 5) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-sm flex flex-col items-center text-center animate-fade-in">
          <div className="text-5xl mb-6">🎉</div>
          <h1 className="text-2xl font-semibold text-foreground mb-2">You're all set!</h1>
          <p className="text-muted-foreground text-sm leading-relaxed mb-2">
            Welcome to Noteshare, {ftue.name || 'musician'}!
          </p>
          <p className="text-foreground font-medium text-base mb-8">
            Happy practicing 🎵
          </p>
          <Button
            size="lg"
            className="w-full bg-gradient-primary text-primary-foreground font-semibold px-8 py-6 text-lg"
            onClick={() => {
              clearFTUEState();
              navigate('/', { replace: true });
            }}
          >
            Start Practicing
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
