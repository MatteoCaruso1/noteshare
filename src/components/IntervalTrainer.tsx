import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Play, RotateCw, ArrowUp, ArrowDown, Check, X, Ear } from 'lucide-react';
import { cn } from '@/lib/utils';

type IntervalDef = {
  id: string;
  semitones: number;
  shortLabel: string; // e.g. "M3"
  fullName: string;   // e.g. "Major 3rd"
  ascendingSong: string;
  descendingSong: string;
  chromatic: boolean; // true = harder/chromatic, hidden by default
};

// Modern, well-known mnemonic songs for each interval
// Sources: musical-u.com, EarMaster, Hooktheory common references
const INTERVALS: IntervalDef[] = [
  {
    id: 'm2',
    semitones: 1,
    shortLabel: 'm2',
    fullName: 'Minor 2nd',
    ascendingSong: 'Jaws (theme) — "duhn-DUHN"',
    descendingSong: 'Für Elise (opening)',
    chromatic: true,
  },
  {
    id: 'M2',
    semitones: 2,
    shortLabel: 'M2',
    fullName: 'Major 2nd',
    ascendingSong: 'Happy Birthday — "Happy BIRTH-day"',
    descendingSong: 'Mary Had a Little Lamb',
    chromatic: false,
  },
  {
    id: 'm3',
    semitones: 3,
    shortLabel: 'm3',
    fullName: 'Minor 3rd',
    ascendingSong: 'Smoke on the Water (riff)',
    descendingSong: 'Hey Jude — "HEY JUDE"',
    chromatic: false,
  },
  {
    id: 'M3',
    semitones: 4,
    shortLabel: 'M3',
    fullName: 'Major 3rd',
    ascendingSong: 'When the Saints Go Marching In',
    descendingSong: "Beethoven's 5th — ba-ba-ba-BAAA",
    chromatic: false,
  },
  {
    id: 'P4',
    semitones: 5,
    shortLabel: 'P4',
    fullName: 'Perfect 4th',
    ascendingSong: 'Here Comes the Bride',
    descendingSong: 'Born Free (theme)',
    chromatic: false,
  },
  {
    id: 'TT',
    semitones: 6,
    shortLabel: 'TT',
    fullName: 'Tritone',
    ascendingSong: 'The Simpsons theme — "The SIMP-sons"',
    descendingSong: 'Black Sabbath — "Black SAB-bath"',
    chromatic: true,
  },
  {
    id: 'P5',
    semitones: 7,
    shortLabel: 'P5',
    fullName: 'Perfect 5th',
    ascendingSong: 'Twinkle Twinkle Little Star',
    descendingSong: 'Flintstones theme — "FLINT-stones"',
    chromatic: false,
  },
  {
    id: 'm6',
    semitones: 8,
    shortLabel: 'm6',
    fullName: 'Minor 6th',
    ascendingSong: 'The Entertainer (Scott Joplin)',
    descendingSong: 'Love Story (theme)',
    chromatic: true,
  },
  {
    id: 'M6',
    semitones: 9,
    shortLabel: 'M6',
    fullName: 'Major 6th',
    ascendingSong: 'Dashing Through the Snow (Jingle Bells verse)',
    descendingSong: 'Over There (G.M. Cohan) — "OH-ver"',
    chromatic: true,
  },
  {
    id: 'm7',
    semitones: 10,
    shortLabel: 'm7',
    fullName: 'Minor 7th',
    ascendingSong: 'Star Trek (original series theme)',
    descendingSong: 'An American in Paris (opening)',
    chromatic: true,
  },
  {
    id: 'M7',
    semitones: 11,
    shortLabel: 'M7',
    fullName: 'Major 7th',
    ascendingSong: 'Take On Me — "TAKE onnn MEEE"',
    descendingSong: 'I Love You (Cole Porter)',
    chromatic: true,
  },
  {
    id: 'P8',
    semitones: 12,
    shortLabel: 'P8',
    fullName: 'Octave',
    ascendingSong: 'Somewhere Over the Rainbow — "SOME-where"',
    descendingSong: 'Willow Weep for Me',
    chromatic: false,
  },
];

interface IntervalTrainerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Direction = 'asc' | 'desc';

interface CurrentRound {
  interval: IntervalDef;
  direction: Direction;
  rootMidi: number; // base note midi
}

// MIDI -> frequency
const midiToFreq = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

export function IntervalTrainer({ open, onOpenChange }: IntervalTrainerProps) {
  const [includeChromatic, setIncludeChromatic] = useState(false);
  const [round, setRound] = useState<CurrentRound | null>(null);
  const [answer, setAnswer] = useState<{ id: string; correct: boolean } | null>(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });

  const audioCtxRef = useRef<AudioContext | null>(null);

  const activeIntervals = useMemo(
    () => INTERVALS.filter((i) => includeChromatic || !i.chromatic),
    [includeChromatic]
  );

  const ensureAudio = useCallback(() => {
    if (!audioCtxRef.current) {
      const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
      audioCtxRef.current = new Ctx();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  // Soft "piano-ish" tone using triangle + low-pass + envelope
  const playNote = useCallback(
    (midi: number, when: number, duration = 0.9) => {
      const ctx = ensureAudio();
      const freq = midiToFreq(midi);

      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq;

      // soft second harmonic for warmth
      const osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.value = freq * 2;

      const gain = ctx.createGain();
      const gain2 = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 2400;

      const start = when;
      const end = start + duration;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.35, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);

      gain2.gain.setValueAtTime(0.0001, start);
      gain2.gain.exponentialRampToValueAtTime(0.08, start + 0.015);
      gain2.gain.exponentialRampToValueAtTime(0.0001, end);

      osc.connect(gain).connect(filter).connect(ctx.destination);
      osc2.connect(gain2).connect(filter);

      osc.start(start);
      osc2.start(start);
      osc.stop(end + 0.05);
      osc2.stop(end + 0.05);
    },
    [ensureAudio]
  );

  const playInterval = useCallback(
    (r: CurrentRound) => {
      const ctx = ensureAudio();
      const now = ctx.currentTime + 0.05;
      const second = r.direction === 'asc'
        ? r.rootMidi + r.interval.semitones
        : r.rootMidi - r.interval.semitones;
      playNote(r.rootMidi, now, 0.85);
      playNote(second, now + 0.7, 0.95);
    },
    [ensureAudio, playNote]
  );

  const newRound = useCallback(() => {
    const interval = activeIntervals[Math.floor(Math.random() * activeIntervals.length)];
    const direction: Direction = Math.random() < 0.5 ? 'asc' : 'desc';
    // Choose a comfortable midrange root (C4..G4 = 60..67)
    const rootMidi = 60 + Math.floor(Math.random() * 8);
    const r: CurrentRound = { interval, direction, rootMidi };
    setRound(r);
    setAnswer(null);
    // Play after a tiny delay so dialog UI settles
    setTimeout(() => playInterval(r), 120);
  }, [activeIntervals, playInterval]);

  // Start first round when dialog opens
  useEffect(() => {
    if (open && !round) {
      // small delay so audio context can init on user gesture (the click that opened it)
      newRound();
    }
    if (!open) {
      // Reset state when closing
      setRound(null);
      setAnswer(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // If chromatic toggle changes mid-session, the next round picks from new pool automatically.

  const handleGuess = (intervalId: string) => {
    if (!round || answer) return;
    const correct = intervalId === round.interval.id;
    setAnswer({ id: intervalId, correct });
    setScore((s) => ({ correct: s.correct + (correct ? 1 : 0), total: s.total + 1 }));
  };

  const handleReplay = () => {
    if (round) playInterval(round);
  };

  const handleNext = () => {
    newRound();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ear className="w-5 h-5 text-primary" />
            Interval Ear Trainer
          </DialogTitle>
          <DialogDescription>
            Listen and choose the correct interval. Each one has a famous song to help you recognize it.
          </DialogDescription>
        </DialogHeader>

        {/* Controls row */}
        <div className="flex items-center justify-between gap-3 py-2 border-b border-border">
          <div className="flex items-center gap-2">
            <Switch
              id="chromatic-toggle"
              checked={includeChromatic}
              onCheckedChange={setIncludeChromatic}
            />
            <Label htmlFor="chromatic-toggle" className="text-sm cursor-pointer">
              Include chromatic intervals
            </Label>
          </div>
          <div className="text-xs text-muted-foreground tabular-nums">
            {score.correct}/{score.total}
          </div>
        </div>

        {/* Direction + replay */}
        {round && (
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              {round.direction === 'asc' ? (
                <>
                  <ArrowUp className="w-4 h-4" /> Ascending
                </>
              ) : (
                <>
                  <ArrowDown className="w-4 h-4" /> Descending
                </>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={handleReplay} className="gap-1.5">
              <Play className="w-3.5 h-3.5" />
              Replay
            </Button>
          </div>
        )}

        {/* Answer grid */}
        <div className="grid grid-cols-2 gap-2">
          {activeIntervals.map((iv) => {
            const isPicked = answer?.id === iv.id;
            const isCorrectAnswer = !!answer && iv.id === round?.interval.id;
            const showHint = !!answer; // reveal song after answering
            const songText =
              round?.direction === 'asc' ? iv.ascendingSong : iv.descendingSong;

            return (
              <button
                key={iv.id}
                onClick={() => handleGuess(iv.id)}
                disabled={!round || !!answer}
                className={cn(
                  'text-left rounded-lg border p-3 transition-colors',
                  'bg-card hover:bg-accent/40',
                  'disabled:cursor-default',
                  !answer && 'border-border',
                  isCorrectAnswer && 'border-green-500 bg-green-500/15',
                  isPicked && !answer?.correct && 'border-destructive bg-destructive/15'
                )}
              >
                <div className="flex items-start gap-2">
                  <div
                    className={cn(
                      'flex items-center justify-center w-9 h-9 rounded-md text-xs font-semibold shrink-0',
                      'bg-muted text-foreground'
                    )}
                  >
                    {iv.shortLabel}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium leading-tight">{iv.fullName}</div>
                    {showHint && (
                      <div className="text-[11px] text-muted-foreground mt-1 leading-snug">
                        {songText}
                      </div>
                    )}
                  </div>
                  {isCorrectAnswer && <Check className="w-4 h-4 text-green-500 shrink-0" />}
                  {isPicked && !answer?.correct && (
                    <X className="w-4 h-4 text-destructive shrink-0" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer / next */}
        {answer && round && (
          <div className="pt-2 space-y-3">
            <div
              className={cn(
                'rounded-lg p-3 text-sm',
                answer.correct
                  ? 'bg-green-500/10 text-green-700 dark:text-green-300 border border-green-500/30'
                  : 'bg-destructive/10 text-destructive border border-destructive/30'
              )}
            >
              {answer.correct ? (
                <div>
                  <strong>Correct!</strong> That was a {round.interval.fullName} (
                  {round.direction === 'asc' ? 'ascending' : 'descending'}).
                </div>
              ) : (
                <div>
                  <strong>Not quite.</strong> That was a {round.interval.fullName} (
                  {round.direction === 'asc' ? 'ascending' : 'descending'}). Think:{' '}
                  <em>
                    {round.direction === 'asc'
                      ? round.interval.ascendingSong
                      : round.interval.descendingSong}
                  </em>
                  .
                </div>
              )}
            </div>
            <Button onClick={handleNext} className="w-full gap-2">
              <RotateCw className="w-4 h-4" />
              Next interval
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
