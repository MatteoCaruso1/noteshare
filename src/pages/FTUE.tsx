import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Music, ChevronRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useFTUEState, clearFTUEState } from '@/hooks/useFTUEState';
import { INSTRUMENTS } from '@/types';
import { useAuth } from '@/hooks/useAuth';

// Step 0: Welcome
// Step 1: Name + Instrument
// Step 2: Practice demo
// Step 3: Create account CTA

export default function FTUE() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const ftue = useFTUEState();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // If already authenticated, redirect home
  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  // Mock timer for practice demo step
  useEffect(() => {
    if (ftue.currentStep !== 2) return;
    const interval = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [ftue.currentStep]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

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
          <p className="text-muted-foreground text-base leading-relaxed mb-12">
            Helping musicians practice smarter. Organize, record, and share your practice, all in one place.
          </p>
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
    const canContinue = trimmedName.length > 0 && trimmedName.length <= 50 && ftue.instrument.length > 0;
    const nameTooLong = ftue.name.trim().length > 50;

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-sm flex flex-col animate-fade-in">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold text-foreground mb-2">Tell us about yourself</h1>
            <p className="text-muted-foreground text-sm">This helps personalize your experience</p>
          </div>

          <div className="space-y-6">
            {/* Name */}
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

            {/* Instrument */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">What do you play?</label>
              <div className="grid grid-cols-3 gap-2">
                {INSTRUMENTS.map((inst) => (
                  <button
                    key={inst}
                    type="button"
                    onClick={() => ftue.setInstrument(inst)}
                    className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-all border ${
                      ftue.instrument === inst
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground'
                    }`}
                  >
                    {ftue.instrument === inst && <Check className="w-3 h-3 inline mr-1" />}
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
              setElapsedSeconds(0);
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

  // Step 2: Practice demo
  if (ftue.currentStep === 2) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Mock session header */}
        <div className="border-b border-border px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Music className="h-5 w-5 text-primary" />
            <span className="font-semibold text-foreground text-sm">Practice Session</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary/15 text-primary">
              <div className="relative">
                <div className="w-2 h-2 rounded-full bg-green-500 recording-pulse" />
              </div>
              <span className="text-xs font-mono">{formatTime(elapsedSeconds)}</span>
            </div>
          </div>
        </div>

        {/* Practice content */}
        <div className="flex-1 flex flex-col p-4 max-w-lg mx-auto w-full">
          <div className="mb-4">
            <p className="text-sm text-muted-foreground mb-1">
              Practicing: <span className="text-foreground font-medium">{ftue.instrument}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Hey {ftue.name}! Try writing what you're working on today.
            </p>
          </div>

          <Textarea
            placeholder="What are you practicing? Write notes, ideas, things to remember..."
            value={ftue.practiceNotes}
            onChange={(e) => ftue.setPracticeNotes(e.target.value)}
            className="flex-1 min-h-[200px] resize-none bg-card border-border text-foreground placeholder:text-muted-foreground/50"
            autoFocus
          />

          <div className="mt-4 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="w-1 h-1 rounded-full bg-muted-foreground/50" />
              <span>In the full app, you can also record audio & video clips</span>
            </div>
            <Button
              size="lg"
              className="w-full bg-gradient-primary text-primary-foreground font-semibold gap-2"
              onClick={() => ftue.nextStep()}
            >
              End Session
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Step 3: Create account to save
  if (ftue.currentStep === 3) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-sm flex flex-col items-center text-center animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-gradient-primary flex items-center justify-center mb-6">
            <Music className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-semibold text-foreground mb-2">Nice work!</h1>
          <p className="text-muted-foreground text-sm leading-relaxed mb-2">
            {ftue.practiceNotes.trim()
              ? `You practiced ${ftue.instrument} for ${formatTime(elapsedSeconds)} and captured your notes.`
              : `You just did a ${formatTime(elapsedSeconds)} ${ftue.instrument} session.`}
          </p>
          <p className="text-foreground font-medium text-base mb-8">
            Create an account to save your practice
          </p>

          <div className="w-full space-y-3">
            <Button
              size="lg"
              className="w-full bg-gradient-primary text-primary-foreground font-semibold py-6 text-lg"
              onClick={() => {
                // Keep FTUE state so auth page can use it after signup
                navigate('/auth');
              }}
            >
              Create Account
            </Button>
            <button
              type="button"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
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

  // Fallback — shouldn't happen
  return null;
}
