// Chord progression library — curated from real songs.
// Each progression is stored in roman-numeral form so it can be transposed to any key.
// At runtime we pick a song + (optional) section slice + random key.

export type Difficulty = 'easy' | 'medium' | 'hard' | 'advanced';

export type ChordQuality =
  | 'maj' | 'min' | 'dim' | 'aug'
  | 'maj7' | 'min7' | 'dom7' | 'min7b5' | 'dim7' | 'minMaj7'
  | 'maj6' | 'min6'
  | 'dom7b9' | 'dom7s11' | 'dom7s9' | 'dom7b13'
  | 'sus4';

export interface ChordSpec {
  /** Scale degree of the chord root (1-7) */
  degree: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  /** Optional accidental applied to the degree (e.g. bVII = degree 7 with 'b') */
  accidental?: 'b' | '#';
  quality: ChordQuality;
  /** Roman-numeral display string (e.g. 'V7', 'ii7', 'iiø7', 'V7♭9', 'bVII') */
  roman: string;
  /** Optional secondary-dominant target degree, for display only */
  secondaryOf?: string;
}

export interface ProgressionEntry {
  songId: string;
  song: string;
  section: string;
  /** Tonic mode of the source progression */
  mode: 'major' | 'minor';
  chords: ChordSpec[];
}

/* ------------------------------------------------------------------ */
/*   EASY — 2-chord diatonic progressions                              */
/* ------------------------------------------------------------------ */
export const EASY: ProgressionEntry[] = [
  { songId: 'happy-birthday', song: 'Happy Birthday', section: 'phrase', mode: 'major',
    chords: [
      { degree: 1, quality: 'maj', roman: 'I' },
      { degree: 5, quality: 'maj', roman: 'V' },
    ]},
  { songId: 'twinkle', song: 'Twinkle Twinkle', section: 'phrase', mode: 'major',
    chords: [
      { degree: 1, quality: 'maj', roman: 'I' },
      { degree: 4, quality: 'maj', roman: 'IV' },
    ]},
  { songId: 'frere-jacques', song: 'Frère Jacques', section: 'opening', mode: 'major',
    chords: [
      { degree: 1, quality: 'maj', roman: 'I' },
      { degree: 5, quality: 'maj', roman: 'V' },
    ]},
  { songId: 'row-row-row', song: 'Row Row Row Your Boat', section: 'opening', mode: 'major',
    chords: [
      { degree: 1, quality: 'maj', roman: 'I' },
      { degree: 4, quality: 'maj', roman: 'IV' },
    ]},
  { songId: 'horse-with-no-name', song: 'A Horse With No Name', section: 'verse', mode: 'minor',
    chords: [
      { degree: 6, quality: 'min', roman: 'i' },
      { degree: 2, quality: 'maj', roman: 'II' },
    ]},
  { songId: 'eleanor-rigby', song: 'Eleanor Rigby', section: 'verse', mode: 'minor',
    chords: [
      { degree: 1, quality: 'min', roman: 'i' },
      { degree: 6, quality: 'maj', roman: 'VI' },
    ]},
];

/* ------------------------------------------------------------------ */
/*   MEDIUM — 3-chord diatonic / pop progressions                      */
/* ------------------------------------------------------------------ */
export const MEDIUM: ProgressionEntry[] = [
  { songId: 'lean-on-me', song: 'Lean On Me', section: 'verse', mode: 'major',
    chords: [
      { degree: 1, quality: 'maj', roman: 'I' },
      { degree: 4, quality: 'maj', roman: 'IV' },
      { degree: 5, quality: 'maj', roman: 'V' },
    ]},
  { songId: 'let-it-be', song: 'Let It Be', section: 'verse', mode: 'major',
    chords: [
      { degree: 1, quality: 'maj', roman: 'I' },
      { degree: 5, quality: 'maj', roman: 'V' },
      { degree: 6, quality: 'min', roman: 'vi' },
      { degree: 4, quality: 'maj', roman: 'IV' },
    ]},
  { songId: 'no-woman-no-cry', song: 'No Woman No Cry', section: 'chorus', mode: 'major',
    chords: [
      { degree: 1, quality: 'maj', roman: 'I' },
      { degree: 5, quality: 'maj', roman: 'V' },
      { degree: 6, quality: 'min', roman: 'vi' },
      { degree: 4, quality: 'maj', roman: 'IV' },
    ]},
  { songId: 'autumn-leaves-a', song: 'Autumn Leaves', section: 'A (start)', mode: 'minor',
    chords: [
      { degree: 2, quality: 'min7', roman: 'ii7' },
      { degree: 5, quality: 'dom7', roman: 'V7' },
      { degree: 1, quality: 'maj7', roman: 'Imaj7' },
    ]},
  { songId: 'fly-me-to-the-moon', song: 'Fly Me to the Moon', section: 'opening', mode: 'minor',
    chords: [
      { degree: 6, quality: 'min7', roman: 'vi7' },
      { degree: 2, quality: 'min7', roman: 'ii7' },
      { degree: 5, quality: 'dom7', roman: 'V7' },
    ]},
  { songId: 'ain-misbehavin', song: "Ain't Misbehavin'", section: 'opening', mode: 'major',
    chords: [
      { degree: 1, quality: 'maj7', roman: 'Imaj7' },
      { degree: 2, quality: 'min7', roman: 'ii7' },
      { degree: 5, quality: 'dom7', roman: 'V7' },
    ]},
];

/* ------------------------------------------------------------------ */
/*   HARD — 4-8 chords, secondary dominants, basic chromaticism        */
/* ------------------------------------------------------------------ */
export const HARD: ProgressionEntry[] = [
  { songId: 'autumn-leaves-full', song: 'Autumn Leaves', section: 'A section', mode: 'minor',
    chords: [
      { degree: 2, quality: 'min7', roman: 'ii7' },
      { degree: 5, quality: 'dom7', roman: 'V7' },
      { degree: 1, quality: 'maj7', roman: 'Imaj7' },
      { degree: 4, quality: 'maj7', roman: 'IVmaj7' },
      { degree: 7, accidental: undefined, quality: 'min7b5', roman: 'viiø7' },
      { degree: 3, quality: 'dom7', roman: 'III7' },
      { degree: 6, quality: 'min7', roman: 'vi7' },
    ]},
  { songId: 'georgia', song: 'Georgia On My Mind', section: 'opening', mode: 'major',
    chords: [
      { degree: 1, quality: 'maj7', roman: 'Imaj7' },
      { degree: 3, quality: 'dom7', roman: 'III7', secondaryOf: 'vi' },
      { degree: 6, quality: 'min7', roman: 'vi7' },
      { degree: 2, quality: 'min7', roman: 'ii7' },
      { degree: 5, quality: 'dom7', roman: 'V7' },
    ]},
  { songId: 'creep', song: 'Creep', section: 'verse', mode: 'major',
    chords: [
      { degree: 1, quality: 'maj', roman: 'I' },
      { degree: 3, quality: 'maj', roman: 'III' },
      { degree: 4, quality: 'maj', roman: 'IV' },
      { degree: 4, quality: 'min', roman: 'iv' },
    ]},
  { songId: 'all-of-me', song: 'All Of Me', section: 'opening', mode: 'major',
    chords: [
      { degree: 1, quality: 'maj7', roman: 'Imaj7' },
      { degree: 3, quality: 'dom7', roman: 'III7', secondaryOf: 'vi' },
      { degree: 6, quality: 'min7', roman: 'vi7' },
      { degree: 7, quality: 'dom7', roman: 'VII7', secondaryOf: 'iii' },
    ]},
  { songId: 'just-friends', song: 'Just Friends', section: 'A section', mode: 'major',
    chords: [
      { degree: 4, quality: 'maj7', roman: 'IVmaj7' },
      { degree: 4, quality: 'min7', roman: 'iv7' },
      { degree: 1, quality: 'maj7', roman: 'Imaj7' },
      { degree: 3, quality: 'min7', roman: 'iii7' },
      { degree: 6, quality: 'dom7', roman: 'VI7', secondaryOf: 'ii' },
      { degree: 2, quality: 'min7', roman: 'ii7' },
      { degree: 5, quality: 'dom7', roman: 'V7' },
    ]},
  { songId: 'blackbird', song: 'Blackbird', section: 'opening', mode: 'major',
    chords: [
      { degree: 1, quality: 'maj', roman: 'I' },
      { degree: 2, quality: 'min', roman: 'ii' },
      { degree: 3, quality: 'min', roman: 'iii' },
      { degree: 4, quality: 'maj', roman: 'IV' },
      { degree: 5, quality: 'maj', roman: 'V' },
      { degree: 6, quality: 'min', roman: 'vi' },
    ]},
];

/* ------------------------------------------------------------------ */
/*   ADVANCED — jazz vocabulary: altered dominants, dim, minMaj         */
/* ------------------------------------------------------------------ */
export const ADVANCED: ProgressionEntry[] = [
  { songId: 'body-and-soul', song: 'Body and Soul', section: 'A section', mode: 'major',
    chords: [
      { degree: 6, quality: 'min7', roman: 'vi7' },
      { degree: 1, accidental: 'b', quality: 'min7', roman: 'bvii7' },
      { degree: 5, accidental: 'b', quality: 'dom7', roman: 'bV7' },
      { degree: 4, quality: 'maj7', roman: 'IVmaj7' },
      { degree: 4, quality: 'min7', roman: 'iv7' },
      { degree: 7, accidental: 'b', quality: 'dom7', roman: 'bVII7' },
      { degree: 1, quality: 'maj7', roman: 'Imaj7' },
    ]},
  { songId: 'misty', song: 'Misty', section: 'opening', mode: 'major',
    chords: [
      { degree: 1, quality: 'maj7', roman: 'Imaj7' },
      { degree: 6, quality: 'min7', roman: 'vi7' },
      { degree: 2, quality: 'min7', roman: 'ii7' },
      { degree: 5, quality: 'dom7b9', roman: 'V7♭9' },
    ]},
  { songId: 'how-insensitive', song: 'How Insensitive', section: 'opening', mode: 'minor',
    chords: [
      { degree: 1, quality: 'minMaj7', roman: 'i(maj7)' },
      { degree: 1, quality: 'min7', roman: 'i7' },
      { degree: 4, quality: 'min6', roman: 'iv6' },
      { degree: 5, quality: 'dom7b9', roman: 'V7♭9' },
    ]},
  { songId: 'satin-doll', song: 'Satin Doll', section: 'A section', mode: 'major',
    chords: [
      { degree: 2, quality: 'min7', roman: 'ii7' },
      { degree: 5, quality: 'dom7', roman: 'V7' },
      { degree: 3, quality: 'min7', roman: 'iii7' },
      { degree: 6, quality: 'dom7', roman: 'VI7' },
      { degree: 2, quality: 'min7', roman: 'ii7' },
      { degree: 5, quality: 'dom7s11', roman: 'V7♯11' },
      { degree: 1, quality: 'maj7', roman: 'Imaj7' },
    ]},
  { songId: 'stella', song: 'Stella By Starlight', section: 'opening', mode: 'major',
    chords: [
      { degree: 7, quality: 'min7b5', roman: 'viiø7' },
      { degree: 3, quality: 'dom7b9', roman: 'III7♭9' },
      { degree: 6, quality: 'min7', roman: 'vi7' },
      { degree: 2, quality: 'dom7', roman: 'II7' },
      { degree: 6, quality: 'min7b5', roman: 'viø7' },
      { degree: 2, quality: 'dom7b9', roman: 'II7♭9' },
    ]},
  { songId: 'night-and-day', song: 'Night and Day', section: 'opening', mode: 'major',
    chords: [
      { degree: 6, accidental: 'b', quality: 'maj7', roman: 'bVImaj7' },
      { degree: 2, quality: 'min7', roman: 'ii7' },
      { degree: 5, quality: 'dom7', roman: 'V7' },
      { degree: 1, quality: 'maj7', roman: 'Imaj7' },
    ]},
  { songId: 'donna-lee', song: 'Donna Lee', section: 'A (turnaround)', mode: 'major',
    chords: [
      { degree: 1, quality: 'maj7', roman: 'Imaj7' },
      { degree: 1, accidental: '#', quality: 'dim7', roman: '#i°7' },
      { degree: 2, quality: 'min7', roman: 'ii7' },
      { degree: 5, quality: 'dom7', roman: 'V7' },
    ]},
];

export const PROGRESSIONS_BY_DIFFICULTY: Record<Difficulty, ProgressionEntry[]> = {
  easy: EASY,
  medium: MEDIUM,
  hard: HARD,
  advanced: ADVANCED,
};

/* ------------------------------------------------------------------ */
/*   Music helpers                                                     */
/* ------------------------------------------------------------------ */

const NOTE_NAMES = ['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B'];
// Major scale degree -> semitone offset
const MAJOR_DEGREE_OFFSETS: Record<number, number> = { 1:0, 2:2, 3:4, 4:5, 5:7, 6:9, 7:11 };

export const QUALITY_INTERVALS: Record<ChordQuality, number[]> = {
  maj:        [0, 4, 7],
  min:        [0, 3, 7],
  dim:        [0, 3, 6],
  aug:        [0, 4, 8],
  sus4:       [0, 5, 7],
  maj6:       [0, 4, 7, 9],
  min6:       [0, 3, 7, 9],
  maj7:       [0, 4, 7, 11],
  min7:       [0, 3, 7, 10],
  dom7:       [0, 4, 7, 10],
  min7b5:     [0, 3, 6, 10],
  dim7:       [0, 3, 6, 9],
  minMaj7:    [0, 3, 7, 11],
  dom7b9:     [0, 4, 7, 10, 13],
  dom7s11:    [0, 4, 7, 10, 18],
  dom7s9:     [0, 4, 7, 10, 15],
  dom7b13:    [0, 4, 7, 10, 20],
};

export const QUALITY_SUFFIX: Record<ChordQuality, string> = {
  maj: '', min: 'm', dim: '°', aug: '+', sus4: 'sus4',
  maj6: '6', min6: 'm6',
  maj7: 'maj7', min7: 'm7', dom7: '7', min7b5: 'ø7', dim7: '°7', minMaj7: 'm(maj7)',
  dom7b9: '7♭9', dom7s11: '7♯11', dom7s9: '7♯9', dom7b13: '7♭13',
};

export interface RealizedChord {
  /** Pretty name e.g. "Cmaj7", "F#°7" */
  name: string;
  roman: string;
  /** Root MIDI (with chosen octave) */
  rootMidi: number;
  /** All chord-tone MIDIs for playback */
  voicing: number[];
  quality: ChordQuality;
}

/** Pick a random key root in C..B */
export function randomKeyRoot(): number {
  return Math.floor(Math.random() * 12); // 0..11 semitone offset from C
}

/** Realize one chord spec in a given key (semitone offset 0..11 from C). */
export function realizeChord(spec: ChordSpec, keyRoot: number, baseOctaveMidi = 48): RealizedChord {
  let degOffset = MAJOR_DEGREE_OFFSETS[spec.degree];
  if (spec.accidental === 'b') degOffset -= 1;
  if (spec.accidental === '#') degOffset += 1;
  const rootSemi = (keyRoot + degOffset + 120) % 12;
  const rootMidi = baseOctaveMidi + rootSemi; // baseOctave + within-octave offset
  const intervals = QUALITY_INTERVALS[spec.quality];
  const voicing = intervals.map((i) => rootMidi + i);
  const name = NOTE_NAMES[rootSemi] + QUALITY_SUFFIX[spec.quality];
  return { name, roman: spec.roman, rootMidi, voicing, quality: spec.quality };
}

/** Realize a full progression with one key. */
export function realizeProgression(entry: ProgressionEntry, keyRoot: number): RealizedChord[] {
  return entry.chords.map((c) => realizeChord(c, keyRoot));
}

export function keyName(keyRoot: number, mode: 'major'|'minor'): string {
  return `${NOTE_NAMES[keyRoot]} ${mode}`;
}

/** Build a level: pick random song, optionally slice (hard/advanced), pick random key. */
export function buildLevel(difficulty: Difficulty): {
  entry: ProgressionEntry;
  keyRoot: number;
  chords: RealizedChord[];
} {
  const pool = PROGRESSIONS_BY_DIFFICULTY[difficulty];
  const entry = pool[Math.floor(Math.random() * pool.length)];
  let chords = entry.chords;
  // For hard/advanced, optionally slice 4-8
  if ((difficulty === 'hard' || difficulty === 'advanced') && entry.chords.length > 4) {
    const min = 4;
    const max = Math.min(8, entry.chords.length);
    const len = min + Math.floor(Math.random() * (max - min + 1));
    const start = Math.max(0, Math.floor(Math.random() * (entry.chords.length - len + 1)));
    chords = entry.chords.slice(start, start + len);
  }
  const keyRoot = randomKeyRoot();
  const realized = chords.map((c) => realizeChord(c, keyRoot));
  return { entry: { ...entry, chords }, keyRoot, chords: realized };
}

/** Build 4 multiple-choice options for a chord, in the same key. Distractors are diatonic. */
export function buildChoices(
  correctSpec: ChordSpec,
  allChordsInLevel: ChordSpec[],
  keyRoot: number,
  difficulty: Difficulty,
): RealizedChord[] {
  const correct = realizeChord(correctSpec, keyRoot);
  const pool: ChordSpec[] = [];

  // Diatonic triads/7ths
  const diatonicMaj7: Record<number, ChordQuality> = {
    1: 'maj7', 2: 'min7', 3: 'min7', 4: 'maj7', 5: 'dom7', 6: 'min7', 7: 'min7b5',
  };
  const diatonicTriads: Record<number, ChordQuality> = {
    1: 'maj', 2: 'min', 3: 'min', 4: 'maj', 5: 'maj', 6: 'min', 7: 'dim',
  };
  const useSeventh = correctSpec.quality.includes('7') || difficulty !== 'easy';
  const map = useSeventh ? diatonicMaj7 : diatonicTriads;
  for (let d = 1; d <= 7; d++) {
    pool.push({ degree: d as 1, quality: map[d], roman: '?' });
  }
  // Include other chords from the level for plausibility
  for (const c of allChordsInLevel) pool.push(c);
  // Add some chromatic spice for hard/advanced
  if (difficulty === 'hard' || difficulty === 'advanced') {
    pool.push({ degree: 7, accidental: 'b', quality: 'dom7', roman: 'bVII7' });
    pool.push({ degree: 6, accidental: 'b', quality: 'maj7', roman: 'bVImaj7' });
    pool.push({ degree: 4, quality: 'min7', roman: 'iv7' });
  }

  // Realize all and dedupe by displayed name; exclude correct
  const realized = pool.map((c) => realizeChord(c, keyRoot));
  const seen = new Set<string>([correct.name]);
  const distractors: RealizedChord[] = [];
  for (const r of realized) {
    if (seen.has(r.name)) continue;
    seen.add(r.name);
    distractors.push(r);
  }
  // Shuffle and take 3
  for (let i = distractors.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [distractors[i], distractors[j]] = [distractors[j], distractors[i]];
  }
  const chosen = distractors.slice(0, 3);
  // Add correct, then shuffle final array
  const final = [correct, ...chosen];
  for (let i = final.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [final[i], final[j]] = [final[j], final[i]];
  }
  return final;
}
