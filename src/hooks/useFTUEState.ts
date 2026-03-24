import { useState, useEffect, useCallback } from 'react';

const FTUE_STORAGE_KEY = 'noteshare_ftue_state';

export interface FTUEState {
  name: string;
  instrument: string;
  instruments: string[];
  practiceNotes: string;
  tags: string[];
  focusLevel: number | null;
  durationMinutes: number;
  currentStep: number;
  startedAt: number; // timestamp
  // Explicit flags for signup gating
  readyForSignup: boolean;
  // Track which FTUE phases the user completed (for analytics funnel)
  completedPhases: number[];
}

const DEFAULT_STATE: FTUEState = {
  name: '',
  instrument: '',
  instruments: [],
  practiceNotes: '',
  tags: [],
  focusLevel: null,
  durationMinutes: 0,
  currentStep: 0,
  startedAt: Date.now(),
  readyForSignup: false,
  completedPhases: [],
};

function loadState(): FTUEState {
  try {
    const raw = localStorage.getItem(FTUE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_STATE, ...parsed };
    }
  } catch {
    // corrupted — start fresh
  }
  return { ...DEFAULT_STATE, startedAt: Date.now() };
}

function saveState(state: FTUEState) {
  try {
    localStorage.setItem(FTUE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage full — ignore
  }
}

export function clearFTUEState() {
  localStorage.removeItem(FTUE_STORAGE_KEY);
}

export function getFTUEState(): FTUEState | null {
  try {
    const raw = localStorage.getItem(FTUE_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return null;
}

export function useFTUEState() {
  const [state, setState] = useState<FTUEState>(loadState);

  // Persist on every change
  useEffect(() => {
    saveState(state);
  }, [state]);

  const setName = useCallback((name: string) => {
    setState(prev => ({ ...prev, name }));
  }, []);

  const setInstrument = useCallback((instrument: string) => {
    setState(prev => ({ ...prev, instrument }));
  }, []);

  const setInstruments = useCallback((instruments: string[]) => {
    setState(prev => ({ ...prev, instruments, instrument: instruments[0] || '' }));
  }, []);

  const setPracticeNotes = useCallback((practiceNotes: string) => {
    setState(prev => ({ ...prev, practiceNotes }));
  }, []);

  const setTags = useCallback((tags: string[]) => {
    setState(prev => ({ ...prev, tags }));
  }, []);

  const setFocusLevel = useCallback((focusLevel: number | null) => {
    setState(prev => ({ ...prev, focusLevel }));
  }, []);

  const setDurationMinutes = useCallback((durationMinutes: number) => {
    setState(prev => ({ ...prev, durationMinutes }));
  }, []);

  const setStep = useCallback((currentStep: number) => {
    setState(prev => ({ ...prev, currentStep }));
  }, []);

  const nextStep = useCallback(() => {
    setState(prev => ({ ...prev, currentStep: prev.currentStep + 1 }));
  }, []);

  const prevStep = useCallback(() => {
    setState(prev => ({ ...prev, currentStep: Math.max(0, prev.currentStep - 1) }));
  }, []);

  const setReadyForSignup = useCallback((readyForSignup: boolean) => {
    setState(prev => ({ ...prev, readyForSignup }));
  }, []);

  const trackPhase = useCallback((phase: number) => {
    setState(prev => {
      if (prev.completedPhases.includes(phase)) return prev;
      return { ...prev, completedPhases: [...prev.completedPhases, phase] };
    });
  }, []);

  const reset = useCallback(() => {
    const fresh = { ...DEFAULT_STATE, startedAt: Date.now() };
    setState(fresh);
    clearFTUEState();
  }, []);

  return {
    ...state,
    setName,
    setInstrument,
    setInstruments,
    setPracticeNotes,
    setTags,
    setFocusLevel,
    setDurationMinutes,
    setStep,
    nextStep,
    prevStep,
    setReadyForSignup,
    trackPhase,
    reset,
  };
}
