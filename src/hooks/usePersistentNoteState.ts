import { useState, useEffect, useCallback } from 'react';
import { AudioFileWithName } from '@/types';

interface PersistentNoteState {
  noteText: string;
  audioFiles: AudioFileWithName[];
  imageFiles: string[];
  tags: string[];
  selectedProjectId: string;
  visibility: 'private' | 'friends';
}

const STORAGE_KEY_PREFIX = 'noteshare_pending_note_';

export function usePersistentNoteState(key: string, profileId: string | undefined) {
  const storageKey = `${STORAGE_KEY_PREFIX}${key}_${profileId || 'anon'}`;

  const loadState = useCallback((): PersistentNoteState => {
    if (typeof window === 'undefined' || !profileId) {
      return getDefaultState();
    }

    const htmlToPlainText = (input: unknown): string => {
      const s = typeof input === 'string' ? input : '';
      // If this looks like HTML (old TipTap content), convert to readable plain text
      if (!/[<>]/.test(s) || !/<\/?[a-z][\s\S]*>/i.test(s)) return s;

      try {
        const doc = new DOMParser().parseFromString(s, 'text/html');
        // Turn block elements into newlines by using innerText when available
        const text = (doc.body as any).innerText ?? doc.body.textContent ?? '';
        return text.replace(/\n{3,}/g, '\n\n').trim();
      } catch {
        // Fallback: strip tags
        return s.replace(/<[^>]*>/g, '').trim();
      }
    };

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          noteText: htmlToPlainText(parsed.noteText || ''),
          audioFiles: parsed.audioFiles || [],
          imageFiles: parsed.imageFiles || [],
          tags: parsed.tags || [],
          selectedProjectId: parsed.selectedProjectId || '',
          visibility: parsed.visibility || 'friends',
        };
      }
    } catch (e) {
      console.error('[usePersistentNoteState] Failed to load state:', e);
    }
    return getDefaultState();
  }, [storageKey, profileId]);

  const [noteText, setNoteText] = useState('');
  const [audioFiles, setAudioFiles] = useState<AudioFileWithName[]>([]);
  const [imageFiles, setImageFiles] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [visibility, setVisibility] = useState<'private' | 'friends'>('friends');
  const [initialized, setInitialized] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    if (!profileId) return;
    const state = loadState();
    setNoteText(state.noteText);
    setAudioFiles(state.audioFiles);
    setImageFiles(state.imageFiles);
    setTags(state.tags);
    setSelectedProjectId(state.selectedProjectId);
    setVisibility(state.visibility);
    setInitialized(true);
  }, [profileId, loadState]);

  // Save to localStorage whenever state changes
  useEffect(() => {
    if (!profileId || !initialized) return;
    
    const state: PersistentNoteState = {
      noteText,
      audioFiles,
      imageFiles,
      tags,
      selectedProjectId,
      visibility,
    };

    // Only save if there's actual content
    const hasContent = noteText || audioFiles.length > 0 || imageFiles.length > 0;
    
    if (hasContent) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(state));
      } catch (e) {
        console.error('[usePersistentNoteState] Failed to save state:', e);
      }
    } else {
      // Clear storage if no content
      localStorage.removeItem(storageKey);
    }
  }, [noteText, audioFiles, imageFiles, tags, selectedProjectId, visibility, storageKey, profileId, initialized]);

  const clearState = useCallback(() => {
    setNoteText('');
    setAudioFiles([]);
    setImageFiles([]);
    setTags([]);
    setSelectedProjectId('');
    setVisibility('friends');
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  return {
    noteText,
    setNoteText,
    audioFiles,
    setAudioFiles,
    imageFiles,
    setImageFiles,
    tags,
    setTags,
    selectedProjectId,
    setSelectedProjectId,
    visibility,
    setVisibility,
    clearState,
  };
}

function getDefaultState(): PersistentNoteState {
  return {
    noteText: '',
    audioFiles: [],
    imageFiles: [],
    tags: [],
    selectedProjectId: '',
    visibility: 'friends',
  };
}
