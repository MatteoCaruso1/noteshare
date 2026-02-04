import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';

const SHARE_EDUCATION_KEY = 'noteshare_share_education_completed';
const SHARE_EDUCATION_TRIGGER_COUNT = 7;

interface ShareEducationContextType {
  showShareEducation: boolean;
  currentStep: number;
  noteIdToShow: string | null;
  startShareEducation: (noteId: string) => void;
  nextStep: () => void;
  completeShareEducation: () => void;
  checkAndTrigger: (noteId: string, totalNoteCount: number) => void;
}

const ShareEducationContext = createContext<ShareEducationContextType | undefined>(undefined);

export function ShareEducationProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const [showShareEducation, setShowShareEducation] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [noteIdToShow, setNoteIdToShow] = useState<string | null>(null);

  // Check if user has completed share education
  const hasCompletedShareEducation = useCallback((userId: string) => {
    try {
      const completed = localStorage.getItem(`${SHARE_EDUCATION_KEY}_${userId}`);
      return completed === 'true';
    } catch {
      return false;
    }
  }, []);

  const markShareEducationCompleted = useCallback((userId: string) => {
    try {
      localStorage.setItem(`${SHARE_EDUCATION_KEY}_${userId}`, 'true');
    } catch {
      // Ignore storage errors
    }
  }, []);

  const startShareEducation = useCallback((noteId: string) => {
    setNoteIdToShow(noteId);
    setCurrentStep(0);
    setShowShareEducation(true);
  }, []);

  const completeShareEducation = useCallback(() => {
    if (profile?.id) {
      markShareEducationCompleted(profile.id);
    }
    setShowShareEducation(false);
    setCurrentStep(0);
    setNoteIdToShow(null);
  }, [profile?.id, markShareEducationCompleted]);

  const nextStep = useCallback(() => {
    // Steps: 0 = intro message, 1 = click note, 2 = click share, 3 = show options, 4 = final
    if (currentStep >= 4) {
      completeShareEducation();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep, completeShareEducation]);

  // Check if we should trigger the share education (after 7th note)
  const checkAndTrigger = useCallback((noteId: string, totalNoteCount: number) => {
    if (!profile?.id) return;
    if (hasCompletedShareEducation(profile.id)) return;
    if (totalNoteCount !== SHARE_EDUCATION_TRIGGER_COUNT) return;
    
    // Trigger the education flow
    startShareEducation(noteId);
  }, [profile?.id, hasCompletedShareEducation, startShareEducation]);

  return (
    <ShareEducationContext.Provider
      value={{
        showShareEducation,
        currentStep,
        noteIdToShow,
        startShareEducation,
        nextStep,
        completeShareEducation,
        checkAndTrigger,
      }}
    >
      {children}
    </ShareEducationContext.Provider>
  );
}

export function useShareEducation() {
  const context = useContext(ShareEducationContext);
  if (context === undefined) {
    throw new Error('useShareEducation must be used within a ShareEducationProvider');
  }
  return context;
}

// Helper to check if user has completed share education (for external use)
export function checkShareEducationCompleted(userId: string): boolean {
  try {
    const completed = localStorage.getItem(`${SHARE_EDUCATION_KEY}_${userId}`);
    return completed === 'true';
  } catch {
    return false;
  }
}
