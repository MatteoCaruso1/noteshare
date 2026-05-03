import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Music2, Play, RotateCw, Check, X, Trophy, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  Difficulty, buildLevel, buildChoices, keyName,
  RealizedChord, ProgressionEntry,
} from '@/lib/chordProgressionLibrary';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Level {
  entry: ProgressionEntry;
  keyRoot: number;
  chords: RealizedChord[];
  /** 4-choice options per chord, parallel to chords */
  options: RealizedChord[][];
}

const LEVELS_PER_GAME = 10;
const POINTS_PER_CORRECT = 10;
const PERFECT_BONUS = 25;

const DIFFICULTY_META: Record<Difficulty, { label: string; sub: string }> = {
  easy:     { label: 'Easy',     sub: '2 chords · diatonic triads' },
  medium:   { label: 'Medium',   sub: '3 chords · pop & jazz basics' },
  hard:     { label: 'Hard',     sub: '4–8 chords · secondary dominants' },
  advanced: { label: 'Advanced', sub: '4–8 chords · jazz vocabulary' },
};

// Build a full game of 10 levels up front (no per-level fetching)
function buildGame(difficulty: Difficulty): Level[] {
  const levels: Level[] = [];
  for (let i = 0; i < LEVELS_PER_GAME; i++) {
    const { entry, keyRoot, chords } = buildLevel(difficulty);
    const options = entry.chords.map((spec) => buildChoices(spec, entry.chords, keyRoot, difficulty));
    levels.push({ entry, keyRoot, chords, options });
  }
  return levels;
}

// MIDI -> frequency
const midiToFreq = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

export function ChordProgressionGame({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [game, setGame] = useState<Level[] | null>(null);
  const [levelIdx, setLevelIdx] = useState(0);
  const [chordIdx, setChordIdx] = useState(0);
  /** picked option name per chord in this level */
  const [picks, setPicks] = useState<(string | null)[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [highScores, setHighScores] = useState<Record<Difficulty, number>>({
    easy: 0, medium: 0, hard: 0, advanced: 0,
  });
  const [savedHighThisRun, setSavedHighThisRun] = useState<number | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);

  const ensureAudio = useCallback(() => {
    if (!audioCtxRef.current) {
      const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
      audioCtxRef.current = new Ctx();
    }
    if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();
    return audioCtxRef.current;
  }, []);

  // Soft piano-ish chord voicing
  const playChord = useCallback((midis: number[], when: number, duration = 1.2) => {
    const ctx = ensureAudio();
    midis.forEach((m, i) => {
      const freq = midiToFreq(m);
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.value = freq * 2;
      const gain = ctx.createGain();
      const gain2 = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 2200;
      const start = when + i * 0.005;
      const end = start + duration;
      const peak = Math.max(0.06, 0.22 / Math.sqrt(midis.length));
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(peak, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);
      gain2.gain.setValueAtTime(0.0001, start);
      gain2.gain.exponentialRampToValueAtTime(peak * 0.3, start + 0.02);
      gain2.gain.exponentialRampToValueAtTime(0.0001, end);
      osc.connect(gain).connect(filter).connect(ctx.destination);
      osc2.connect(gain2).connect(filter);
      osc.start(start); osc2.start(start);
      osc.stop(end + 0.05); osc2.stop(end + 0.05);
    });
  }, [ensureAudio]);

  const playProgression = useCallback((chords: RealizedChord[]) => {
    const ctx = ensureAudio();
    const start = ctx.currentTime + 0.1;
    const stride = 0.95;
    chords.forEach((c, i) => playChord(c.voicing, start + i * stride, stride + 0.2));
  }, [ensureAudio, playChord]);

  // Load high scores once when dialog opens
  useEffect(() => {
    if (!open || !user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('chord_game_scores')
        .select('difficulty, high_score')
        .eq('user_id', user.id);
      if (cancelled || !data) return;
      const next = { easy: 0, medium: 0, hard: 0, advanced: 0 } as Record<Difficulty, number>;
      data.forEach((r: any) => { next[r.difficulty as Difficulty] = r.high_score ?? 0; });
      setHighScores(next);
    })();
    return () => { cancelled = true; };
  }, [open, user]);

  // Reset everything when closing
  useEffect(() => {
    if (!open) {
      setDifficulty(null); setGame(null); setLevelIdx(0); setChordIdx(0);
      setPicks([]); setRevealed(false); setScore(0); setStreak(0); setSavedHighThisRun(null);
    }
  }, [open]);

  const startGame = (d: Difficulty) => {
    const g = buildGame(d);
    setDifficulty(d);
    setGame(g);
    setLevelIdx(0); setChordIdx(0);
    setPicks(new Array(g[0].chords.length).fill(null));
    setRevealed(false); setScore(0); setStreak(0); setSavedHighThisRun(null);
    setTimeout(() => playProgression(g[0].chords), 200);
  };

  const currentLevel = game && difficulty ? game[levelIdx] : null;
  const isFinished = !!game && levelIdx >= LEVELS_PER_GAME;

  const handlePick = (name: string) => {
    if (!currentLevel || revealed) return;
    if (picks[chordIdx] != null) return;
    const next = [...picks];
    next[chordIdx] = name;
    setPicks(next);
    const isCorrect = currentLevel.chords[chordIdx].name === name;
    if (isCorrect) {
      setScore((s) => s + POINTS_PER_CORRECT);
      setStreak((s) => s + 1);
    } else {
      setStreak(0);
    }
    // Auto-advance to next chord, or reveal if last
    setTimeout(() => {
      if (chordIdx + 1 < currentLevel.chords.length) {
        setChordIdx((i) => i + 1);
      } else {
        // All chords answered for this level
        const allCorrect = next.every((p, i) => p === currentLevel.chords[i].name);
        if (allCorrect) setScore((s) => s + PERFECT_BONUS);
        setRevealed(true);
      }
    }, 250);
  };

  const handleNextLevel = () => {
    if (!game) return;
    const nextIdx = levelIdx + 1;
    if (nextIdx >= LEVELS_PER_GAME) {
      setLevelIdx(nextIdx);
      // persist high score
      void persistHighScore();
      return;
    }
    setLevelIdx(nextIdx);
    setChordIdx(0);
    setPicks(new Array(game[nextIdx].chords.length).fill(null));
    setRevealed(false);
    setTimeout(() => playProgression(game[nextIdx].chords), 200);
  };

  const persistHighScore = async () => {
    if (!user || !difficulty) return;
    const prev = highScores[difficulty] ?? 0;
    if (score <= prev) return;
    setHighScores({ ...highScores, [difficulty]: score });
    setSavedHighThisRun(score);
    await supabase.from('chord_game_scores').upsert({
      user_id: user.id,
      difficulty,
      high_score: score,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,difficulty' });
  };

  const handlePlayAgain = () => {
    if (!difficulty) return;
    startGame(difficulty);
  };

  const handleBackToMenu = () => {
    setDifficulty(null); setGame(null); setLevelIdx(0); setChordIdx(0);
    setPicks([]); setRevealed(false); setScore(0); setStreak(0); setSavedHighThisRun(null);
  };

  /* ---------------- RENDER ---------------- */

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto p-4 gap-3">
        <DialogHeader className="space-y-1">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Music2 className="w-5 h-5 text-primary" />
            Guess the Chord Progression
          </DialogTitle>
          <DialogDescription className="text-xs">
            {!difficulty
              ? 'Pick a difficulty. 10 progressions from real songs, transposed to a random key.'
              : `Level ${Math.min(levelIdx + 1, LEVELS_PER_GAME)} of ${LEVELS_PER_GAME} · ${DIFFICULTY_META[difficulty].label}`}
          </DialogDescription>
        </DialogHeader>

        {/* MENU */}
        {!difficulty && (
          <div className="space-y-2">
            {(Object.keys(DIFFICULTY_META) as Difficulty[]).map((d) => (
              <button
                key={d}
                onClick={() => startGame(d)}
                className="w-full text-left rounded-lg border border-border bg-card hover:bg-accent/40 transition-colors p-3 flex items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold">{DIFFICULTY_META[d].label}</div>
                  <div className="text-xs text-muted-foreground">{DIFFICULTY_META[d].sub}</div>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Trophy className="w-3.5 h-3.5" />
                  {highScores[d] ?? 0}
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}

        {/* IN-GAME */}
        {currentLevel && !isFinished && (
          <GameBody
            level={currentLevel}
            chordIdx={chordIdx}
            picks={picks}
            revealed={revealed}
            score={score}
            streak={streak}
            onReplay={() => playProgression(currentLevel.chords)}
            onPlayCorrect={() => playProgression(currentLevel.chords)}
            onPick={handlePick}
            onNext={handleNextLevel}
          />
        )}

        {/* FINISHED */}
        {isFinished && difficulty && (
          <div className="space-y-3 text-center pt-2">
            <Trophy className="w-10 h-10 text-primary mx-auto" />
            <div>
              <div className="text-2xl font-bold">{score} pts</div>
              <div className="text-xs text-muted-foreground mt-1">
                {savedHighThisRun != null
                  ? <span className="text-green-500 font-medium">New high score!</span>
                  : <>High score: {highScores[difficulty]}</>}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handleBackToMenu}>Menu</Button>
              <Button className="flex-1 gap-2" onClick={handlePlayAgain}>
                <RotateCw className="w-4 h-4" /> Play again
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- IN-GAME BODY ---------------- */

function GameBody({
  level, chordIdx, picks, revealed, score, streak,
  onReplay, onPlayCorrect, onPick, onNext,
}: {
  level: Level;
  chordIdx: number;
  picks: (string | null)[];
  revealed: boolean;
  score: number;
  streak: number;
  onReplay: () => void;
  onPlayCorrect: () => void;
  onPick: (name: string) => void;
  onNext: () => void;
}) {
  const correctChord = level.chords[chordIdx];
  const options = level.options[chordIdx];
  const allCorrect = revealed && picks.every((p, i) => p === level.chords[i].name);

  return (
    <div className="space-y-3">
      {/* Top stat row */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div>Key: <span className="text-foreground font-medium">{keyName(level.keyRoot, level.entry.mode)}</span></div>
        <div className="flex items-center gap-3">
          <span>Score <span className="text-foreground font-semibold">{score}</span></span>
          {streak >= 2 && <span className="text-primary">🔥 {streak}</span>}
        </div>
      </div>

      {/* Chord pip row */}
      <div className="flex items-center gap-1.5 justify-center">
        {level.chords.map((c, i) => {
          const pick = picks[i];
          const correct = pick === c.name;
          const answered = pick != null;
          const isActive = i === chordIdx && !revealed;
          return (
            <div
              key={i}
              className={cn(
                'h-2 flex-1 rounded-full transition-colors',
                isActive && 'bg-primary',
                !isActive && !answered && 'bg-muted',
                answered && correct && 'bg-green-500',
                answered && !correct && 'bg-destructive',
              )}
            />
          );
        })}
      </div>

      {/* Replay */}
      <div className="flex justify-center">
        <Button variant="outline" size="sm" onClick={onReplay} className="gap-1.5 h-8">
          <Play className="w-3.5 h-3.5" /> Replay progression
        </Button>
      </div>

      {/* Prompt */}
      {!revealed && (
        <div className="text-center text-sm text-muted-foreground">
          Chord <span className="text-foreground font-semibold">{chordIdx + 1}</span> of {level.chords.length}
        </div>
      )}

      {/* Options */}
      {!revealed && (
        <div className="grid grid-cols-2 gap-1.5">
          {options.map((opt) => {
            const isPicked = picks[chordIdx] === opt.name;
            const isCorrect = opt.name === correctChord.name;
            const showState = picks[chordIdx] != null;
            return (
              <button
                key={opt.name}
                onClick={() => onPick(opt.name)}
                disabled={picks[chordIdx] != null}
                className={cn(
                  'rounded-md border p-2 text-left transition-colors',
                  'bg-card hover:bg-accent/40 disabled:cursor-default',
                  'border-border',
                  showState && isCorrect && 'border-green-500 bg-green-500/15',
                  showState && isPicked && !isCorrect && 'border-destructive bg-destructive/15',
                )}
              >
                <div className="text-sm font-semibold flex items-center gap-1.5">
                  {opt.name}
                  {showState && isCorrect && <Check className="w-3.5 h-3.5 text-green-500" />}
                  {showState && isPicked && !isCorrect && <X className="w-3.5 h-3.5 text-destructive" />}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{opt.roman}</div>
              </button>
            );
          })}
        </div>
      )}

      {/* Reveal panel */}
      {revealed && (
        <div className="space-y-3 pt-1">
          <div className={cn(
            'rounded-lg p-3 text-sm border',
            allCorrect
              ? 'bg-green-500/10 text-green-700 dark:text-green-300 border-green-500/30'
              : 'bg-card border-border',
          )}>
            <div className="font-semibold mb-1">
              {allCorrect ? 'Perfect level! +25 bonus' : 'Progression revealed'}
            </div>
            <div className="text-xs text-muted-foreground mb-2">
              {level.entry.song} — {level.entry.section}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {level.chords.map((c, i) => {
                const wasRight = picks[i] === c.name;
                return (
                  <div
                    key={i}
                    className={cn(
                      'rounded-md border px-2 py-1 text-xs',
                      wasRight ? 'border-green-500/50 bg-green-500/10' : 'border-border bg-card',
                    )}
                  >
                    <div className="font-semibold">{c.name}</div>
                    <div className="text-[10px] text-muted-foreground">{c.roman}</div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onPlayCorrect} className="gap-1.5 flex-1">
              <Play className="w-3.5 h-3.5" /> Hear it
            </Button>
            <Button onClick={onNext} className="gap-2 flex-1">
              Next level <RotateCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
