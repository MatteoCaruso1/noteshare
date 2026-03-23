import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { getFTUEState } from '@/hooks/useFTUEState';
import { Profile, PracticeSession, NoteWithAuthor } from '@/types';

interface FTUEPreviewContextType {
  isFTUEPreview: boolean;
  previewProfile: Profile;
  previewSession: PracticeSession | null;
  previewNotes: NoteWithAuthor[];
  sessionActive: boolean;
  startPreviewSession: () => void;
  endPreviewSession: () => void;
  savePreviewSession: (durationMinutes: number, noteText: string, focusLevel?: number) => void;
  /** Phase tracking for spotlight overlay */
  tourPhase: number;
  setTourPhase: (phase: number) => void;
}

const FTUEPreviewContext = createContext<FTUEPreviewContextType | undefined>(undefined);

const FAKE_PROFILE_ID = 'ftue-preview-profile';

function createFakeProfile(name: string): Profile {
  return {
    id: FAKE_PROFILE_ID,
    user_id: null,
    name: name || 'Musician',
    username: 'preview-user',
    avatar: null,
    bio: null,
    location: null,
    instruments: [],
    genres: [],
    skill_level: null,
    open_to_collaborate: false,
    followers_count: 0,
    following_count: 0,
    current_streak: 0,
    celebrated_streak_milestones: [],
    streak_achievement_counts: null,
    selected_award: null,
    has_logged_first_note: false,
    has_added_first_friend: false,
    has_logged_ten_notes: false,
    color_theme: null,
    has_completed_onboarding: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function createFakeSession(): PracticeSession {
  return {
    id: 'ftue-preview-session',
    user_id: FAKE_PROFILE_ID,
    started_at: new Date().toISOString(),
    ended_at: null,
    goals: null,
    notes_summary: null,
    is_active: true,
    paused_at: null,
    paused_duration_ms: 0,
    collaborator_ids: null,
    created_at: new Date().toISOString(),
  };
}

export function FTUEPreviewProvider({ name, children }: { name: string; children: ReactNode }) {
  const [previewProfile] = useState(() => createFakeProfile(name));
  const [previewSession, setPreviewSession] = useState<PracticeSession | null>(null);
  const [previewNotes, setPreviewNotes] = useState<NoteWithAuthor[]>([]);
  const [tourPhase, setTourPhase] = useState(0);

  const startPreviewSession = useCallback(() => {
    setPreviewSession(createFakeSession());
  }, []);

  const endPreviewSession = useCallback(() => {
    setPreviewSession(null);
  }, []);

  const savePreviewSession = useCallback((durationMinutes: number, noteText: string, focusLevel?: number) => {
    const now = new Date().toISOString();
    const tags: string[] = [];
    if (focusLevel) tags.push(`F=${focusLevel}`);
    
    // Persist note data to FTUE localStorage so commit-ftue can send it
    try {
      const FTUE_STORAGE_KEY = 'noteshare_ftue_state';
      const raw = localStorage.getItem(FTUE_STORAGE_KEY);
      if (raw) {
        const state = JSON.parse(raw);
        state.practiceNotes = noteText || '';
        state.durationMinutes = durationMinutes;
        state.focusLevel = focusLevel ?? null;
        state.tags = tags;
        localStorage.setItem(FTUE_STORAGE_KEY, JSON.stringify(state));
      }
    } catch {
      // ignore storage errors
    }

    const fakeNote: NoteWithAuthor = {
      id: `ftue-note-${Date.now()}`,
      author_id: FAKE_PROFILE_ID,
      session_id: 'ftue-preview-session',
      project_id: null,
      goal_id: null,
      gig_id: null,
      focus_entry_id: null,
      focus_date: null,
      focus_text_snapshot: null,
      focus_title_snapshot: null,
      text_content: noteText || null,
      audio_files: [],
      audio_file_names: [],
      image_files: [],
      video_files: [],
      video_path: null,
      video_name: null,
      video_thumbnail_path: null,
      tags,
      visibility: 'private',
      private_audio_indices: [],
      comment_count: 0,
      created_at: now,
      updated_at: now,
      author: previewProfile,
      session: {
        id: 'ftue-preview-session',
        user_id: FAKE_PROFILE_ID,
        started_at: new Date(Date.now() - durationMinutes * 60000).toISOString(),
        ended_at: now,
        goals: null,
        notes_summary: null,
        is_active: false,
        paused_at: null,
        paused_duration_ms: 0,
        collaborator_ids: null,
        created_at: now,
      },
    };
    setPreviewNotes([fakeNote]);
    setPreviewSession(null);
  }, [previewProfile]);

  return (
    <FTUEPreviewContext.Provider
      value={{
        isFTUEPreview: true,
        previewProfile,
        previewSession,
        previewNotes,
        sessionActive: !!previewSession,
        startPreviewSession,
        endPreviewSession,
        savePreviewSession,
        tourPhase,
        setTourPhase,
      }}
    >
      {children}
    </FTUEPreviewContext.Provider>
  );
}

export function useFTUEPreview(): FTUEPreviewContextType {
  const context = useContext(FTUEPreviewContext);
  if (!context) {
    // Return a "not in preview" default so components can safely call this
    return {
      isFTUEPreview: false,
      previewProfile: null as any,
      previewSession: null,
      previewNotes: [],
      sessionActive: false,
      startPreviewSession: () => {},
      endPreviewSession: () => {},
      savePreviewSession: () => {},
      tourPhase: -1,
      setTourPhase: () => {},
    };
  }
  return context;
}
