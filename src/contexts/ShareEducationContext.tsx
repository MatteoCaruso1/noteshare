import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

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

  const startShareEducation = useCallback((noteId: string) => {
    setNoteIdToShow(noteId);
    setCurrentStep(0);
    setShowShareEducation(true);
  }, []);

  const completeShareEducation = useCallback(() => {
    if (profile?.id) {
      // Persist in DB — fire and forget
      supabase.from('profiles').update({ has_seen_share_education: true }).eq('id', profile.id).then(() => {});
    }
    setShowShareEducation(false);
    setCurrentStep(0);
    setNoteIdToShow(null);
  }, [profile?.id]);

  const nextStep = useCallback(() => {
    if (currentStep >= 4) {
      completeShareEducation();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep, completeShareEducation]);

  // Check if we should trigger the share education (after 7th note)
  const checkAndTrigger = useCallback((noteId: string, totalNoteCount: number) => {
    if (!profile?.id) return;
    if (profile.has_seen_share_education) return;
    if (totalNoteCount !== SHARE_EDUCATION_TRIGGER_COUNT) return;
    
    startShareEducation(noteId);
  }, [profile?.id, profile?.has_seen_share_education, startShareEducation]);

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
