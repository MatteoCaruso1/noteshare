import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Music, ChevronRight, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useFTUEState, clearFTUEState, getFTUEState } from '@/hooks/useFTUEState';
import { INSTRUMENTS } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { startGoogleOAuth } from '@/lib/oauth';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

// Step 0: Welcome
// Step 1: Name + Instrument
// Step 2: Create account (signup only — no login)

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
);

/** Commit FTUE data to the backend after signup */
async function commitFTUEData(): Promise<boolean> {
  const state = getFTUEState();
  if (!state) return false;

  const idempotencyKey = `${state.startedAt}`;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error('[FTUE] No session for commit');
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
      console.error('[FTUE] Commit error:', error);
      return false;
    }

    console.log('[FTUE] Commit success:', data);
    return true;
  } catch (err) {
    console.error('[FTUE] Commit exception:', err);
    return false;
  }
}

export default function FTUE() {
  const navigate = useNavigate();
  const { user, signUp: authSignUp } = useAuth();
  const queryClient = useQueryClient();
  const ftue = useFTUEState();

  // Signup form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [signupLoading, setSignupLoading] = useState(false);
  const [commitPending, setCommitPending] = useState(false);
  const commitAttemptedRef = useRef(false);

  // After signup + auth, commit FTUE data then redirect
  useEffect(() => {
    if (!user) return;
    if (commitAttemptedRef.current) return;

    const state = getFTUEState();
    if (!state || state.currentStep < 2) {
      navigate('/', { replace: true });
      return;
    }

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
      navigate('/', { replace: true });
    };

    doCommit();
  }, [user, navigate, queryClient]);

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setPasswordTouched(true);
      return;
    }
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

  // Step 0: Welcome
  if (ftue.currentStep === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-sm flex flex-col items-center text-center animate-fade-in">
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

  // Step 1: Name + Instrument
  if (ftue.currentStep === 1) {
    const trimmedName = ftue.name.trim();
    const canContinue = trimmedName.length > 0 && trimmedName.length <= 50 && ftue.instruments.length > 0;
    const nameTooLong = ftue.name.trim().length > 50;

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
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold text-foreground mb-2">Tell us about yourself</h1>
            <p className="text-muted-foreground text-sm">This helps personalize your experience</p>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Your name</label>
              <Input
                placeholder="Enter your name"
                value={ftue.name}
                onChange={(e) => ftue.setName(e.target.value.slice(0, 60))}
                autoFocus
                autoComplete="off"
                maxLength={60}
              />
              {nameTooLong && (
                <p className="text-xs text-destructive">Name must be 50 characters or less</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">What do you play?</label>
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
            </div>
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

  // Step 2: Create account
  if (ftue.currentStep === 2) {
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
            Sign up to start tracking your practice
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

  return null;
}
