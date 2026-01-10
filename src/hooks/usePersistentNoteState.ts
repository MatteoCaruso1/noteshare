import { useState, useEffect, useCallback, useRef } from 'react';
import { AudioFileWithName } from '@/types';

interface PersistentNoteState {
  noteText: string;
  audioFiles: AudioFileWithName[];
  imageFiles: string[];
  tags: string[];
  selectedProjectId: string;
  visibility: 'private' | 'friends';
  pendingUploads?: PendingUpload[];
}

interface PendingUpload {
  id: string;
  type: 'audio' | 'image';
  status: 'uploading' | 'completed' | 'failed';
  url?: string;
  name?: string;
  duration?: number;
  startedAt: number;
}

const STORAGE_KEY_PREFIX = 'noteshare_pending_note_';

// Save state immediately to localStorage (bypass React state)
function saveStateToStorage(storageKey: string, state: PersistentNoteState) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
  } catch (e) {
    console.error('[usePersistentNoteState] Failed to save state:', e);
  }
}

// Load state from localStorage
function loadStateFromStorage(storageKey: string): PersistentNoteState | null {
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('[usePersistentNoteState] Failed to load state:', e);
  }
  return null;
}

export function usePersistentNoteState(key: string, profileId: string | undefined) {
  const storageKey = `${STORAGE_KEY_PREFIX}${key}_${profileId || 'anon'}`;
  const isMountedRef = useRef(true);

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

    const stored = loadStateFromStorage(storageKey);
    if (stored) {
      // Process any completed pending uploads into audioFiles/imageFiles
      const completedAudioUploads = (stored.pendingUploads || [])
        .filter(u => u.type === 'audio' && u.status === 'completed' && u.url)
        .map(u => ({ url: u.url!, name: u.name || '', duration: u.duration }));
      
      const completedImageUploads = (stored.pendingUploads || [])
        .filter(u => u.type === 'image' && u.status === 'completed' && u.url)
        .map(u => u.url!);

      return {
        noteText: htmlToPlainText(stored.noteText || ''),
        audioFiles: [...(stored.audioFiles || []), ...completedAudioUploads],
        imageFiles: [...(stored.imageFiles || []), ...completedImageUploads],
        tags: stored.tags || [],
        selectedProjectId: stored.selectedProjectId || '',
        visibility: stored.visibility || 'friends',
        pendingUploads: [], // Clear processed uploads
      };
    }
    return getDefaultState();
  }, [storageKey, profileId]);

  const [noteText, setNoteText] = useState('');
  const [audioFiles, setAudioFilesState] = useState<AudioFileWithName[]>([]);
  const [imageFiles, setImageFilesState] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [visibility, setVisibility] = useState<'private' | 'friends'>('friends');
  const [initialized, setInitialized] = useState(false);

  // Wrapper for setAudioFiles that also saves immediately to localStorage
  const setAudioFiles = useCallback((files: AudioFileWithName[] | ((prev: AudioFileWithName[]) => AudioFileWithName[])) => {
    setAudioFilesState(prev => {
      const newFiles = typeof files === 'function' ? files(prev) : files;
      // Immediately persist to localStorage
      const currentState = loadStateFromStorage(storageKey);
      if (currentState) {
        saveStateToStorage(storageKey, { ...currentState, audioFiles: newFiles, pendingUploads: [] });
      }
      return newFiles;
    });
  }, [storageKey]);

  // Wrapper for setImageFiles that also saves immediately to localStorage
  const setImageFiles = useCallback((files: string[] | ((prev: string[]) => string[])) => {
    setImageFilesState(prev => {
      const newFiles = typeof files === 'function' ? files(prev) : files;
      // Immediately persist to localStorage
      const currentState = loadStateFromStorage(storageKey);
      if (currentState) {
        saveStateToStorage(storageKey, { ...currentState, imageFiles: newFiles, pendingUploads: [] });
      }
      return newFiles;
    });
  }, [storageKey]);

  // Track component mount status
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Load from localStorage on mount
  useEffect(() => {
    if (!profileId) return;
    const state = loadState();
    setNoteText(state.noteText);
    setAudioFilesState(state.audioFiles);
    setImageFilesState(state.imageFiles);
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
      saveStateToStorage(storageKey, state);
    } else {
      // Clear storage if no content
      localStorage.removeItem(storageKey);
    }
  }, [noteText, audioFiles, imageFiles, tags, selectedProjectId, visibility, storageKey, profileId, initialized]);

  const clearState = useCallback(() => {
    setNoteText('');
    setAudioFilesState([]);
    setImageFilesState([]);
    setTags([]);
    setSelectedProjectId('');
    setVisibility('friends');
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  // Helper to add a pending upload marker before upload starts
  const addPendingUpload = useCallback((type: 'audio' | 'image', uploadId: string, metadata?: { name?: string; duration?: number }) => {
    const currentState = loadStateFromStorage(storageKey) || getDefaultState();
    const pendingUpload: PendingUpload = {
      id: uploadId,
      type,
      status: 'uploading',
      startedAt: Date.now(),
      name: metadata?.name,
      duration: metadata?.duration,
    };
    saveStateToStorage(storageKey, {
      ...currentState,
      pendingUploads: [...(currentState.pendingUploads || []), pendingUpload],
    });
  }, [storageKey]);

  // Helper to mark a pending upload as completed
  const completePendingUpload = useCallback((uploadId: string, url: string) => {
    const currentState = loadStateFromStorage(storageKey);
    if (!currentState) return;

    const pendingUploads = currentState.pendingUploads || [];
    const uploadIndex = pendingUploads.findIndex(u => u.id === uploadId);
    
    if (uploadIndex === -1) return;

    const upload = pendingUploads[uploadIndex];
    
    // Move completed upload directly to audioFiles or imageFiles
    if (upload.type === 'audio') {
      const newAudioFile: AudioFileWithName = { url, name: upload.name || '', duration: upload.duration };
      currentState.audioFiles = [...(currentState.audioFiles || []), newAudioFile];
    } else {
      currentState.imageFiles = [...(currentState.imageFiles || []), url];
    }
    
    // Remove from pending
    currentState.pendingUploads = pendingUploads.filter(u => u.id !== uploadId);
    
    saveStateToStorage(storageKey, currentState);
    
    // If component is still mounted, update React state
    if (isMountedRef.current) {
      if (upload.type === 'audio') {
        setAudioFilesState(currentState.audioFiles);
      } else {
        setImageFilesState(currentState.imageFiles);
      }
    }
  }, [storageKey]);

  // Helper to mark a pending upload as failed
  const failPendingUpload = useCallback((uploadId: string) => {
    const currentState = loadStateFromStorage(storageKey);
    if (!currentState) return;
    
    currentState.pendingUploads = (currentState.pendingUploads || []).filter(u => u.id !== uploadId);
    saveStateToStorage(storageKey, currentState);
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
    // Upload tracking
    addPendingUpload,
    completePendingUpload,
    failPendingUpload,
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
    pendingUploads: [],
  };
}
