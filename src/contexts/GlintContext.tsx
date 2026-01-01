import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

interface GlintContextType {
  isPaused: boolean;
  glintStyle: React.CSSProperties;
  setPracticeExpanded: (expanded: boolean) => void;
  setQuickNoteExpanded: (expanded: boolean) => void;
  setFocusFocused: (focused: boolean) => void;
}

const GlintContext = createContext<GlintContextType | undefined>(undefined);

// Shared start time for synchronized animations
const GLINT_START_TIME = Date.now();
const GLINT_DURATION_MS = 4500; // Must match CSS animation duration

export function GlintProvider({ children }: { children: ReactNode }) {
  const [practiceExpanded, setPracticeExpanded] = useState(false);
  const [quickNoteExpanded, setQuickNoteExpanded] = useState(false);
  const [focusFocused, setFocusFocused] = useState(false);

  // Calculate animation delay to sync all glints to the same phase
  const [glintStyle, setGlintStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    // Calculate how far into the animation cycle we are
    const elapsed = (Date.now() - GLINT_START_TIME) % GLINT_DURATION_MS;
    // Use negative delay to "catch up" to the current position in the cycle
    const delay = -elapsed;
    
    setGlintStyle({
      '--glint-delay': `${delay}ms`,
    } as React.CSSProperties);
  }, []);

  // Glint is paused if any of these are true
  const isPaused = practiceExpanded || quickNoteExpanded || focusFocused;

  return (
    <GlintContext.Provider
      value={{
        isPaused,
        glintStyle,
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
