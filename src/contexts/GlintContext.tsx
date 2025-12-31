import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface GlintContextType {
  isPaused: boolean;
  setPracticeExpanded: (expanded: boolean) => void;
  setQuickNoteExpanded: (expanded: boolean) => void;
  setFocusFocused: (focused: boolean) => void;
}

const GlintContext = createContext<GlintContextType | undefined>(undefined);

export function GlintProvider({ children }: { children: ReactNode }) {
  const [practiceExpanded, setPracticeExpanded] = useState(false);
  const [quickNoteExpanded, setQuickNoteExpanded] = useState(false);
  const [focusFocused, setFocusFocused] = useState(false);

  // Glint is paused if any of these are true
  const isPaused = practiceExpanded || quickNoteExpanded || focusFocused;

  return (
    <GlintContext.Provider
      value={{
        isPaused,
        setPracticeExpanded: useCallback((v: boolean) => setPracticeExpanded(v), []),
        setQuickNoteExpanded: useCallback((v: boolean) => setQuickNoteExpanded(v), []),
        setFocusFocused: useCallback((v: boolean) => setFocusFocused(v), []),
      }}
    >
      {children}
    </GlintContext.Provider>
  );
}

export function useGlint() {
  const context = useContext(GlintContext);
  if (!context) {
    throw new Error('useGlint must be used within a GlintProvider');
  }
  return context;
}
