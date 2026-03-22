import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Music, ChevronRight, Check, Square, Clock, Zap, Tag, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useFTUEState, clearFTUEState } from '@/hooks/useFTUEState';
import { INSTRUMENTS } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { RichTextarea } from '@/components/RichTextarea';
import { TagInput } from '@/components/TagInput';

// Step 0: Welcome
// Step 1: Name + Instrument
// Step 2: Practice session (live capture)
// Step 3: Save session review (duration, focus, tags)
// Step 4: Create account CTA

function FocusLevelSelector({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  return (
    <div className="flex items-center gap-3">
      <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <Zap className="w-4 h-4" />
        Focus level
      </label>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((level) => {
          const filled = value !== null && level <= value;
          return (
            <button
              key={level}
              type="button"
              onClick={() => onChange(value === level ? null : level)}
              className="touch-manipulation p-0"
              aria-label={`Focus level ${level}`}
            >
              <Zap
                className={`w-5 h-5 transition-colors ${
                  filled
                    ? 'text-primary fill-primary'
                    : 'text-muted-foreground/30'
                }`}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function FTUE() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const ftue = useFTUEState();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [durationInput, setDurationInput] = useState('');

  // If already authenticated, redirect home
  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  // Mock timer for practice session step
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

  // Step 2: Live practice session
  if (ftue.currentStep === 2) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Session header */}
        <div className="border-b border-border px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Music className="h-5 w-5 text-primary" />
            <span className="font-semibold text-foreground text-sm">Practice Session</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary/15 text-primary">
            <div className="relative">
              <div className="w-2 h-2 rounded-full bg-green-500 recording-pulse" />
            </div>
            <span className="text-xs font-mono">{formatTime(elapsedSeconds)}</span>
          </div>
        </div>

        {/* Practice content */}
        <div className="flex-1 flex flex-col p-4 max-w-lg mx-auto w-full">
          <div className="mb-4">
            <p className="text-sm text-muted-foreground mb-1">
              Practicing: <span className="text-foreground font-medium">{ftue.instrument}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              Hey {ftue.name}! Try writing what you're working on.
            </p>
          </div>

          {/* Notes input using RichTextarea (supports bullets, checkboxes) */}
          <div className="flex-1 min-h-0">
            <RichTextarea
              value={ftue.practiceNotes}
              onChange={ftue.setPracticeNotes}
              placeholder="What are you practicing? Write notes, ideas, things to remember..."
              rows={8}
              autoExpand
              showTips
              className="min-h-[200px] bg-card border-border text-sm"
            />
          </div>

          {/* Tags inline */}
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <TagInput
              tags={ftue.tags}
              onChange={ftue.setTags}
              iconOnly
            />
            {ftue.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {ftue.tags.map(tag => (
                  <span key={tag} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="w-1 h-1 rounded-full bg-muted-foreground/50" />
              <span>In the full app, you can also record audio & video clips</span>
            </div>
            <Button
              size="lg"
              className="w-full font-semibold gap-2"
              variant="destructive"
              onClick={() => {
                // Capture elapsed time as duration
                const mins = Math.max(1, Math.round(elapsedSeconds / 60));
                ftue.setDurationMinutes(mins);
                setDurationInput(String(mins));
                ftue.nextStep();
              }}
            >
              <Square className="w-4 h-4" />
              End Session
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Step 3: Save session review (mirrors EndSessionDialog)
  if (ftue.currentStep === 3) {
    const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      if (value === '' || /^\d+$/.test(value)) {
        setDurationInput(value);
        const parsed = parseInt(value, 10);
        if (parsed >= 1) {
          ftue.setDurationMinutes(parsed);
        }
      }
    };

    const isValidDuration = durationInput.trim() !== '' && (parseInt(durationInput, 10) || 0) >= 1;

    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <div className="border-b border-border px-4 py-3 flex items-center gap-3">
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => ftue.setStep(2)}
          >
            ←
          </button>
          <h1 className="text-xl font-semibold text-foreground">Save Session</h1>
        </div>

        <div className="flex-1 p-4 max-w-lg mx-auto w-full space-y-5">
          {/* Duration */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Duration
            </label>
            <Input
              type="text"
              inputMode="numeric"
              value={durationInput}
              onChange={handleDurationChange}
              className="w-16 bg-muted/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="text-sm text-muted-foreground">min</span>
          </div>

          {/* Focus Level */}
          <FocusLevelSelector value={ftue.focusLevel} onChange={ftue.setFocusLevel} />

          {/* Tags */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Tags
            </label>
            <TagInput
              tags={ftue.tags}
              onChange={ftue.setTags}
            />
          </div>

          {/* Notes preview */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">Session notes</label>
            <RichTextarea
              value={ftue.practiceNotes}
              onChange={ftue.setPracticeNotes}
              placeholder="Add notes about your session..."
              rows={4}
              autoExpand
              className="bg-card border-border text-sm"
            />
          </div>
        </div>

        {/* Save button */}
        <div className="p-4 border-t border-border max-w-lg mx-auto w-full">
          <Button
            className="w-full bg-gradient-primary text-primary-foreground font-semibold gap-2"
            size="lg"
            disabled={!isValidDuration}
            onClick={() => ftue.nextStep()}
          >
            <Save className="w-4 h-4" />
            Save Session
          </Button>
        </div>
      </div>
    );
  }

  // Step 4: Create account to save
  if (ftue.currentStep === 4) {
    const durationDisplay = ftue.durationMinutes >= 1 ? `${ftue.durationMinutes} min` : formatTime(elapsedSeconds);

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-sm flex flex-col items-center text-center animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-gradient-primary flex items-center justify-center mb-6">
            <Music className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-semibold text-foreground mb-2">Nice work!</h1>
          <p className="text-muted-foreground text-sm leading-relaxed mb-2">
            {ftue.practiceNotes.trim()
              ? `You practiced ${ftue.instrument} for ${durationDisplay} and captured your notes.`
              : `You just did a ${durationDisplay} ${ftue.instrument} session.`}
          </p>
          {ftue.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 justify-center mb-2">
              {ftue.tags.map(tag => (
                <span key={tag} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          )}
          <p className="text-foreground font-medium text-base mb-8">
            Create an account to save your practice
          </p>

          <div className="w-full space-y-3">
            <Button
              size="lg"
              className="w-full bg-gradient-primary text-primary-foreground font-semibold py-6 text-lg"
              onClick={() => {
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

  return null;
}
