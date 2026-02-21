import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useActiveSession, useStartSession, useEndSession, useRecentSessionNotes, usePauseSession, useResumeSession, useDeleteSession } from '@/hooks/useSessions';
import { useCreateNote } from '@/hooks/useNotes';
import { useProjects } from '@/hooks/useProjects';
import { useGoals } from '@/hooks/useGoals';
import { useMyPromoPosts } from '@/hooks/usePromoPosts';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { useCurrentFocusEntry } from '@/hooks/useDailyFocus';
import { useCreateNoteShares } from '@/hooks/useNoteShares';
import { useShareEducation } from '@/contexts/ShareEducationContext';
import { useHomescreenPromptTrigger } from '@/components/AddToHomescreenPrompt';

import { usePersistentNoteState } from '@/hooks/usePersistentNoteState';
import { useDailyNoteLimit } from '@/hooks/useDailyNoteLimit';
import { useGlint } from '@/contexts/GlintContext';
import { AudioRecorder, clearRecordingBackup } from '@/components/AudioRecorder';
import { AudioFileItem } from '@/components/AudioFileItem';
import { MediaUploadButton } from '@/components/MediaUploadButton';
import { OfflineSessionInput } from '@/components/OfflineSessionInput';
import { RecordingRecoveryBanner } from '@/components/RecordingRecoveryBanner';
import { RichTextarea } from '@/components/RichTextarea';
import { LinkToPicker } from '@/components/LinkToPicker';
import { EndSessionDialog } from '@/components/EndSessionDialog';
import { Metronome } from '@/components/Metronome';
import { PracticeTimer } from '@/components/PracticeTimer';

import { SignedImage } from '@/components/SignedImage';
import { ImagePreviewDialog } from '@/components/ImagePreviewDialog';
import { DailyLimitBanner } from '@/components/DailyLimitBanner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Play, Square, Clock, X, Lock, Users, Settings, StickyNote, Pause, ChevronDown, ChevronRight, Trash2, LockOpen } from 'lucide-react';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

// Session-specific settings storage key
const SESSION_SETTINGS_KEY = 'noteshare_session_settings';

interface SessionSettings {
  wakeLockEnabled: boolean;
  attachFocus: boolean;
  sessionId: string | null;
}

const getSessionSettings = (): SessionSettings => {
  try {
    const stored = sessionStorage.getItem(SESSION_SETTINGS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore
  }
  return { wakeLockEnabled: false, attachFocus: false, sessionId: null };
};

const saveSessionSettings = (settings: Partial<SessionSettings>) => {
  try {
    const current = getSessionSettings();
    sessionStorage.setItem(SESSION_SETTINGS_KEY, JSON.stringify({ ...current, ...settings }));
  } catch {
    // Ignore
  }
};

const clearSessionSettings = () => {
  try {
    sessionStorage.removeItem(SESSION_SETTINGS_KEY);
  } catch {
    // Ignore
  }
};

// Get today's date as YYYY-MM-DD in local timezone
function getTodayLocalDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function PracticeControls() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const { data: activeSession } = useActiveSession(profile?.id);
  const { data: projects } = useProjects();
  const { data: goals } = useGoals(profile?.id);
  const { data: gigs } = useMyPromoPosts(profile?.id);
  const { data: recentNotes } = useRecentSessionNotes(profile?.id);
  const { data: currentFocus } = useCurrentFocusEntry();
  
  const startSession = useStartSession();
  const endSession = useEndSession();
  const deleteSession = useDeleteSession();
  const pauseSession = usePauseSession();
  const resumeSession = useResumeSession();
  const { checkAndTrigger } = useShareEducation();
  const { triggerPrompt: triggerHomescreenPrompt } = useHomescreenPromptTrigger();
  
  const handleNoteCreated = useCallback((noteId: string, totalCount: number) => {
    checkAndTrigger(noteId, totalCount);
    triggerHomescreenPrompt(totalCount);
  }, [checkAndTrigger, triggerHomescreenPrompt]);
  
  const createNote = useCreateNote(handleNoteCreated);
  const createNoteShares = useCreateNoteShares();
  const { uploadAudio, uploadImage, uploadFile, uploading } = useMediaUpload();
  const { isPaused, glintStyle, setPracticeExpanded, setHasActiveSession } = useGlint();
  const { hasReachedLimit, notesPostedToday, dailyLimit, incrementCount, isPremium } = useDailyNoteLimit();

  // Use persistent state for note content that survives navigation
  const {
    noteText,
    setNoteText,
    audioFiles,
    setAudioFiles,
    imageFiles,
    setImageFiles,
    tags,
    setTags,
    selectedLink,
    setSelectedLink,
    visibility,
    setVisibility,
    clearState,
    addPendingUpload,
    completePendingUpload,
    failPendingUpload,
  } = usePersistentNoteState('practice_session', profile?.id);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Initialize from session storage if we have the same active session
  const storedSettings = getSessionSettings();
  const isStoredSessionMatch = activeSession && storedSettings.sessionId === activeSession.id;
  
  const [attachFocus, setAttachFocusState] = useState(() => 
    isStoredSessionMatch ? storedSettings.attachFocus : false
  );
  const [wakeLockEnabled, setWakeLockEnabledState] = useState(() => 
    isStoredSessionMatch ? storedSettings.wakeLockEnabled : false
  );
  const [showSessionChoice, setShowSessionChoice] = useState(false);
  const [manuallyCollapsed, setManuallyCollapsed] = useState(false);
  const [isStartingSession, setIsStartingSession] = useState(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [showEndSessionDialog, setShowEndSessionDialog] = useState(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  
  // Wrapper to persist attachFocus changes
  const setAttachFocus = useCallback((value: boolean) => {
    setAttachFocusState(value);
    if (activeSession) {
      saveSessionSettings({ attachFocus: value, sessionId: activeSession.id });
    }
  }, [activeSession]);
  
  // Wrapper to persist wakeLockEnabled changes
  const setWakeLockEnabled = useCallback((value: boolean) => {
    setWakeLockEnabledState(value);
    if (activeSession) {
      saveSessionSettings({ wakeLockEnabled: value, sessionId: activeSession.id });
    }
  }, [activeSession]);
  
  // Sync session ID when active session changes
  useEffect(() => {
    if (activeSession) {
      const stored = getSessionSettings();
      if (stored.sessionId === activeSession.id) {
        // Restore settings for this session
        setAttachFocusState(stored.attachFocus);
        setWakeLockEnabledState(stored.wakeLockEnabled);
        // Re-acquire wake lock if it was enabled
        if (stored.wakeLockEnabled && (!wakeLockRef.current || wakeLockRef.current.released)) {
          acquireWakeLock(true);
        }
      } else {
        // New session, clear old settings
        saveSessionSettings({ wakeLockEnabled: false, attachFocus: false, sessionId: activeSession.id });
      }
    }
  }, [activeSession?.id]);

  // Determine if we should show the collapsible content
  // Active session can now be collapsed manually
  // Keep expanded during session start transition to avoid jarring close/open
  const isExpanded = activeSession 
    ? !manuallyCollapsed 
    : (showSessionChoice || isStartingSession);

  // Sync expanded state with glint context (glint paused when expanded)
  useEffect(() => {
    setPracticeExpanded(isExpanded);
  }, [isExpanded, setPracticeExpanded]);

  // Sync active session state with context for vignette overlay
  useEffect(() => {
    setHasActiveSession(!!activeSession);
  }, [activeSession, setHasActiveSession]);

  // Helper to acquire wake lock
  const acquireWakeLock = useCallback(async (silent = false) => {
    if (!('wakeLock' in navigator)) {
      if (!silent) toast.error('Screen lock prevention not supported on this device');
      return false;
    }
    
    try {
      // Release existing lock first to ensure clean state
      if (wakeLockRef.current) {
        try {
          await wakeLockRef.current.release();
        } catch {
          // Ignore
        }
        wakeLockRef.current = null;
      }
      
      wakeLockRef.current = await navigator.wakeLock.request('screen');
      
      // Listen for release events on this lock
      wakeLockRef.current.addEventListener('release', () => {
        // Lock was released (e.g., by system), try to re-acquire if still enabled
        if (wakeLockEnabled && document.visibilityState === 'visible') {
          acquireWakeLock(true);
        }
      });
      
      return true;
    } catch (err) {
      console.error('Wake lock request failed:', err);
      if (!silent) toast.error('Could not keep screen unlocked');
      return false;
    }
  }, [wakeLockEnabled]);

  // Toggle wake lock on/off
  const toggleWakeLock = useCallback(async () => {
    const newState = !wakeLockEnabled;
    
    if (newState) {
      const success = await acquireWakeLock(false);
      if (success) {
        setWakeLockEnabled(true);
        toast.success('Screen will stay unlocked during session');
      }
    } else {
      if (wakeLockRef.current) {
        try {
          await wakeLockRef.current.release();
        } catch {
          // Ignore release errors
        }
        wakeLockRef.current = null;
      }
      setWakeLockEnabled(false);
      toast.success('Screen unlocked mode disabled');
    }
  }, [wakeLockEnabled, acquireWakeLock]);

  // Re-acquire wake lock on visibility change, focus, and user interaction
  useEffect(() => {
    if (!wakeLockEnabled) return;

    const reacquire = async () => {
      if (document.visibilityState === 'visible' && wakeLockEnabled) {
        // Check if lock is still valid
        if (!wakeLockRef.current || wakeLockRef.current.released) {
          await acquireWakeLock(true);
        }
      }
    };

    // Visibility change (tab becomes visible again)
    document.addEventListener('visibilitychange', reacquire);
    
    // Window focus (user returns to window)
    window.addEventListener('focus', reacquire);
    
    // User interaction events (touch/click can re-enable wake lock)
    const handleInteraction = () => {
      if (wakeLockEnabled && (!wakeLockRef.current || wakeLockRef.current.released)) {
        acquireWakeLock(true);
      }
    };
    document.addEventListener('touchstart', handleInteraction, { passive: true });
    document.addEventListener('click', handleInteraction, { passive: true });
    
    // Periodic check every 30 seconds to ensure lock is still active
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible' && wakeLockEnabled) {
        if (!wakeLockRef.current || wakeLockRef.current.released) {
          acquireWakeLock(true);
        }
      }
    }, 30000);

    return () => {
      document.removeEventListener('visibilitychange', reacquire);
      window.removeEventListener('focus', reacquire);
      document.removeEventListener('touchstart', handleInteraction);
      document.removeEventListener('click', handleInteraction);
      clearInterval(interval);
    };
  }, [wakeLockEnabled, acquireWakeLock]);

  // Release wake lock when session ends or component unmounts
  useEffect(() => {
    if (!activeSession && wakeLockRef.current) {
      wakeLockRef.current.release().catch(() => {});
      wakeLockRef.current = null;
      setWakeLockEnabledState(false);
      clearSessionSettings();
    }
    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
      }
    };
  }, [activeSession]);

  // Force session refresh when app returns to foreground (iOS lock/unlock fix)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && profile?.id) {
        queryClient.invalidateQueries({ queryKey: ['active-session', profile.id] });
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [profile?.id, queryClient]);

  // Listen for "open-end-session-dialog" event from AppHeader
  useEffect(() => {
    const handler = () => {
      if (activeSession) {
        setManuallyCollapsed(false); // expand the card
        setShowEndSessionDialog(true);
      }
    };
    window.addEventListener('open-end-session-dialog', handler);
    return () => window.removeEventListener('open-end-session-dialog', handler);
  }, [activeSession]);

  // Live-updating timer - must be before early return
  const [, setTick] = useState(0);
  const isSessionPaused = !!activeSession?.paused_at;
  
  useEffect(() => {
    if (!activeSession || isSessionPaused) return;
    const interval = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(interval);
  }, [activeSession, isSessionPaused]);

  if (!profile) return null;

  const handleStartSession = () => {
    startSession.mutate({ userId: profile.id });
  };

  const handlePauseSession = () => {
    if (activeSession) {
      pauseSession.mutate({ sessionId: activeSession.id, userId: profile.id });
    }
  };

  const handleResumeSession = () => {
    if (activeSession) {
      resumeSession.mutate({ sessionId: activeSession.id, userId: profile.id });
    }
  };

  const handleDeleteSession = () => {
    if (activeSession) {
      // Release wake lock if active
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
      // Clear all session-related state
      clearState();
      clearSessionSettings();
      deleteSession.mutate({ sessionId: activeSession.id, userId: profile.id });
    }
  };

  const handleAudioRecorded = async (blob: Blob, duration: number, backupId?: string) => {
    // Generate unique ID for tracking this upload
    const uploadId = `audio-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Mark upload as pending BEFORE starting (survives navigation)
    addPendingUpload('audio', uploadId, { name: '', duration });
    
    try {
      const url = await uploadAudio(blob, profile.id);
      if (url) {
        // Mark as completed - this will persist even if user navigated away
        completePendingUpload(uploadId, url);
        // Clear backup on successful upload
        if (backupId) {
          await clearRecordingBackup(backupId);
        }
        toast.success('Recording saved!');
      } else {
        failPendingUpload(uploadId);
        toast.error('Failed to save recording. Check the recovery banner to retry.');
      }
    } catch (error) {
      console.error('Audio upload failed:', error);
      failPendingUpload(uploadId);
      toast.error('Failed to save recording. Check the recovery banner to retry.');
    }
  };

  const handleAudioFileUpload = async (file: File) => {
    const uploadId = `audio-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const name = file.name.replace(/\.[^/.]+$/, '') || '';
    
    addPendingUpload('audio', uploadId, { name });
    
    try {
      const url = await uploadFile(file, profile.id, 'audio');
      if (url) {
        completePendingUpload(uploadId, url);
      } else {
        failPendingUpload(uploadId);
      }
    } catch (error) {
      console.error('Audio file upload failed:', error);
      failPendingUpload(uploadId);
    }
  };

  const handleImageUpload = async (file: File) => {
    const uploadId = `image-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    addPendingUpload('image', uploadId);
    
    try {
      const url = await uploadImage(file, profile.id);
      if (url) {
        completePendingUpload(uploadId, url);
      } else {
        failPendingUpload(uploadId);
      }
    } catch (error) {
      console.error('Image upload failed:', error);
      failPendingUpload(uploadId);
    }
  };

  const handleRenameAudio = (index: number, newName: string) => {
    setAudioFiles(audioFiles.map((a, i) => i === index ? { ...a, name: newName } : a));
  };

  const handleSaveNoteAndEndSession = (sessionTitle?: string, customDurationMinutes?: number, playingWithIds?: string[]) => {
    if (activeSession) {
      // Calculate session duration in minutes (accounting for paused time)
      const totalElapsedMs = Date.now() - new Date(activeSession.started_at).getTime();
      const pausedMs = activeSession.paused_duration_ms || 0;
      // If currently paused, add the current pause duration
      const currentPauseMs = activeSession.paused_at 
        ? Date.now() - new Date(activeSession.paused_at).getTime() 
        : 0;
      const activeDurationMs = totalElapsedMs - pausedMs - currentPauseMs;
      const sessionDurationMinutes = customDurationMinutes ?? Math.floor(activeDurationMs / 60000);

      // Check daily limit before creating note (session can still be ended)
      if (hasReachedLimit) {
        endSession.mutate(
          { sessionId: activeSession.id, userId: profile.id, collaboratorIds: playingWithIds, customDurationMinutes },
          {
            onSuccess: () => {
              clearState();
              clearSessionSettings();
              setShowEndSessionDialog(false);
              setManuallyCollapsed(true);
              toast.error('Session ended but note not saved - daily limit reached. Get Pro for unlimited notes.');
            },
          }
        );
        return;
      }

      // Build notes summary with optional session title
      const notesSummary = sessionTitle || undefined;

      endSession.mutate(
        { sessionId: activeSession.id, userId: profile.id, notesSummary, collaboratorIds: playingWithIds, customDurationMinutes },
        {
          onSuccess: () => {
            // Determine projectId, goalId, and gigId based on selectedLink
            const projectId = selectedLink?.type === 'project' ? selectedLink.id : undefined;
            const goalId = selectedLink?.type === 'goal' ? selectedLink.id : undefined;
            const gigId = selectedLink?.type === 'gig' ? selectedLink.id : undefined;
            
            createNote.mutate(
              {
                authorId: profile.id,
                textContent: noteText || undefined,
                audioFiles: audioFiles.map(a => a.url),
                audioFileNames: audioFiles.map(a => a.name),
                imageFiles,
                tags,
                sessionId: activeSession.id,
                projectId,
                goalId,
                gigId,
                visibility,
                focusEntryId: attachFocus && currentFocus ? currentFocus.id : undefined,
                focusDate: attachFocus && currentFocus ? getTodayLocalDate() : undefined,
                focusTextSnapshot: attachFocus && currentFocus ? currentFocus.focus_text : undefined,
              },
              {
                onSuccess: (newNote) => {
                  incrementCount(); // Update local count optimistically
                  
                  // Share with selected friends if any
                  if (playingWithIds && playingWithIds.length > 0 && newNote?.id) {
                    createNoteShares.mutate({
                      noteId: newNote.id,
                      sharedWithIds: playingWithIds,
                    });
                  }
                  
                  clearState();
                  clearSessionSettings();
                  setShowEndSessionDialog(false);
                  setManuallyCollapsed(true);
                },
              }
            );
          },
        }
      );
    }
  };

  // Calculate active session duration (excluding paused time)
  const getSessionDuration = () => {
    if (!activeSession) return null;
    
    const totalElapsedMs = Date.now() - new Date(activeSession.started_at).getTime();
    const pausedMs = activeSession.paused_duration_ms || 0;
    // If currently paused, add the current pause duration
    const currentPauseMs = activeSession.paused_at 
      ? Date.now() - new Date(activeSession.paused_at).getTime() 
      : 0;
    const activeDurationMs = totalElapsedMs - pausedMs - currentPauseMs;
    
    const totalMinutes = Math.floor(activeDurationMs / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const sessionDuration = getSessionDuration();

  // Handle practice dropdown open/close
  const handlePracticeOpen = (open: boolean) => {
    if (activeSession) {
      // Toggle collapse state for active session
      setManuallyCollapsed(!open);
    } else {
      setShowSessionChoice(open);
    }
  };

  const handleStartLiveSession = () => {
    if (!startSession.isPending) {
      setIsStartingSession(true); // Keep expanded during transition
      startSession.mutate({ userId: profile.id }, {
        onSettled: () => {
          setIsStartingSession(false);
        }
      });
      // Don't setShowSessionChoice(false) - let activeSession becoming truthy hide this naturally
      setManuallyCollapsed(false); // Ensure expanded when starting
    }
  };

  return (
    <Card className="bg-card border-border min-h-[60px]">
      <Collapsible open={isExpanded} onOpenChange={handlePracticeOpen}>
        <CollapsibleTrigger asChild>
          {/* Glint effect disabled but kept for potential future use: add `glint ${isPaused ? 'glint-paused' : ''}` to className and style={glintStyle} */}
          <button 
            className="w-full px-3 py-4 sm:px-4 flex items-center justify-between transition-colors rounded-lg group"
          >
            <div className="flex items-center gap-2">
              <Play className={`w-5 h-5 transition-colors ${activeSession ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`} />
              <h2 className="font-semibold">
                {activeSession ? 'Practice Session' : 'Start Practice Session'}
              </h2>
              {/* Show "Active" when collapsed with active session */}
              {activeSession && (
                <span 
                  className={`text-sm font-medium transition-opacity duration-300 ${
                    manuallyCollapsed 
                      ? 'opacity-100' 
                      : 'opacity-0'
                  } ${
                    isSessionPaused 
                      ? 'text-muted-foreground' 
                      : 'text-primary'
                  }`}
                >
                  {isSessionPaused ? 'Paused' : 'Active'}
                </span>
              )}
            </div>
            {isExpanded ? (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            )}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          {/* Session Choice Step - shown when no active session OR while starting */}
          {!activeSession && (showSessionChoice || isStartingSession) && (
            <div className="px-3 sm:px-4 pb-4 space-y-3 min-h-[100px]">
              <Button
                className="w-full bg-gradient-primary text-primary-foreground"
                onClick={handleStartLiveSession}
                disabled={startSession.isPending || isStartingSession}
              >
                <Play className="w-4 h-4 mr-2" />
                {isStartingSession ? 'Starting…' : 'Start Live Session'}
              </Button>
              {!isStartingSession && <OfflineSessionInput />}
            </div>
          )}

          {/* Active Session Content */}
          {activeSession && (
          <div className="px-3 sm:px-4 pb-4 space-y-4">
          {/* Recovery banner for orphaned recordings */}
          <RecordingRecoveryBanner />

          {/* Compact toolbar row: Settings (with upload), Link to Goals, Metronome, Timer, Unlock */}
          <TooltipProvider delayDuration={1000}>
            <div className="flex items-center gap-2 flex-wrap mb-4">
              {/* Settings (includes visibility, upload, delete) */}
              <Popover>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Settings className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </PopoverTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Settings</TooltipContent>
                </Tooltip>
                <PopoverContent className="w-48 p-2 bg-popover" align="start">
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground px-2">Visibility</p>
                      <Select value={visibility} onValueChange={(v) => setVisibility(v as 'private' | 'friends')}>
                        <SelectTrigger className="w-full h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="private">
                            <div className="flex items-center gap-2">
                              <Lock className="w-3 h-3" /> Private
                            </div>
                          </SelectItem>
                          <SelectItem value="friends">
                            <div className="flex items-center gap-2">
                              <Users className="w-3 h-3" /> Friends
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Upload Media inside settings */}
                    <div className="border-t border-border pt-2">
                      <p className="text-xs text-muted-foreground px-2 mb-2">Upload Media</p>
                      <MediaUploadButton
                        onAudioUpload={handleAudioFileUpload}
                        onImageUpload={handleImageUpload}
                        uploading={uploading}
                      />
                    </div>
                    
                    {/* Delete Session */}
                    <div className="border-t border-border pt-2">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete session
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="sm:max-w-xs">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete session?</AlertDialogTitle>
                            <AlertDialogDescription className="sr-only">
                              Confirm session deletion
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter className="mt-2">
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              data-no-hover-reset
                              onClick={handleDeleteSession}
                              onTouchEnd={(e) => { e.currentTarget.blur(); }}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 touch-manipulation [-webkit-tap-highlight-color:transparent]"
                              style={{ backgroundColor: 'hsl(var(--destructive))' }}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Link to Goal/Project/Gig */}
              <LinkToPicker
                projects={projects}
                gigs={gigs}
                goals={goals}
                selectedLink={selectedLink}
                onLinkChange={setSelectedLink}
              />
              
              {/* Metronome */}
              <Metronome />
              
              {/* Practice Timer */}
              <PracticeTimer />

              {/* Wake Lock toggle - mobile-optimized button with inline styles when enabled to prevent iOS sticky hover override */}
              <button
                type="button"
                aria-label={wakeLockEnabled ? "Screen unlock ON" : "Screen unlock OFF"}
                aria-pressed={wakeLockEnabled}
                onClick={toggleWakeLock}
                onTouchEnd={(e) => {
                  // Blur immediately after touch to prevent stuck focus state
                  e.currentTarget.blur();
                }}
                className={`
                  h-8 w-8 inline-flex items-center justify-center rounded-md
                  touch-manipulation select-none outline-none
                  focus:outline-none focus-visible:outline-none
                  transition-colors duration-150
                  ${wakeLockEnabled 
                    ? "" 
                    : "bg-transparent text-muted-foreground [@media(hover:hover)]:hover:bg-muted/50"
                  }
                `}
                style={wakeLockEnabled ? {
                  backgroundColor: 'hsl(var(--primary))',
                  color: 'hsl(var(--primary-foreground))'
                } : undefined}
                title="Keep screen unlocked"
              >
                <LockOpen className="w-4 h-4" />
              </button>

              {/* Focus toggle - inline, show if focus exists with text */}
              {currentFocus?.focus_text && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className="flex items-center gap-2 ml-auto cursor-pointer touch-manipulation select-none"
                      data-no-hover-reset
                      onTouchEnd={(e) => { e.currentTarget.blur(); }}
                    >
                      <StickyNote className={`w-4 h-4 ${attachFocus ? 'text-primary' : 'text-muted-foreground'}`} />
                      <Switch
                        id="attach-focus-session"
                        checked={attachFocus}
                        data-no-hover-reset
                        onCheckedChange={(checked) => {
                          setAttachFocus(checked);
                          if (checked) {
                            toast.success("Your session will be linked to Practice Board");
                          } else {
                            toast.success("Your session will no longer be linked to Practice Board");
                          }
                        }}
                        className="scale-90"
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>Link to Practice Board</TooltipContent>
                </Tooltip>
              )}
            </div>
          </TooltipProvider>

          {/* Show daily limit banner if limit reached */}
          {hasReachedLimit && (
            <div className="mb-4">
              <DailyLimitBanner notesPostedToday={notesPostedToday} dailyLimit={dailyLimit} />
            </div>
          )}

          {/* Text Content - with list formatting support */}
          {/* Larger textarea during active sessions for focus */}
          <div className="mb-4">
            <RichTextarea
              placeholder="What are you practicing this session?"
              value={noteText}
              onChange={setNoteText}
              rows={activeSession ? 5 : 1}
              showTips
            />
          </div>


          {/* Uploaded Audio Files - with editable names */}
          {audioFiles.length > 0 && (
            <div className="mb-4 space-y-2">
              {audioFiles.map((audio, i) => (
                <AudioFileItem
                  key={i}
                  audio={audio}
                  onRemove={() => setAudioFiles(audioFiles.filter((_, idx) => idx !== i))}
                  onRename={(newName) => handleRenameAudio(i, newName)}
                />
              ))}
            </div>
          )}
          {/* Uploaded Images */}
          {imageFiles.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {imageFiles.map((url, i) => (
                <div key={i} className="relative">
                  <SignedImage
                    src={url}
                    alt=""
                    className="w-20 h-20 object-cover rounded-lg cursor-pointer"
                    onClick={() => setPreviewImage(url)}
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 w-6 h-6"
                    onClick={() => setImageFiles(imageFiles.filter((_, idx) => idx !== i))}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          <ImagePreviewDialog
            src={previewImage}
            open={!!previewImage}
            onOpenChange={(open) => !open && setPreviewImage(null)}
          />

          {/* Action Buttons - inline full-width, no tooltips on mobile */}
          <div className="flex items-center gap-2">
            {/* Audio Recorder - when recording, shows stop + timer; otherwise mic button */}
            <AudioRecorder 
              onRecorded={handleAudioRecorded} 
              onRecordingChange={setIsRecordingAudio}
              className={isRecordingAudio ? 'shrink-0' : 'flex-1'}
            />
            
            {/* Pause/Resume button - disabled during recording */}
            <Button
              variant="outline"
              size="icon"
              className={`h-9 flex-1 focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 transition-opacity ${
                isRecordingAudio ? 'opacity-40 cursor-not-allowed' : ''
              }`}
              onClick={isSessionPaused ? handleResumeSession : handlePauseSession}
              onTouchEnd={(e) => e.currentTarget.blur()}
              disabled={pauseSession.isPending || resumeSession.isPending || isRecordingAudio}
              title={isRecordingAudio ? 'Stop recording first' : (isSessionPaused ? 'Resume' : 'Pause')}
            >
              {isSessionPaused ? (
                <Play className="w-4 h-4" />
              ) : (
                <Pause className="w-4 h-4" />
              )}
            </Button>
            {/* End Session button - disabled during recording */}
            <Button
              size="icon"
              className={`h-9 flex-1 bg-gradient-primary text-primary-foreground focus:outline-none focus-visible:outline-none transition-opacity ${
                isRecordingAudio ? 'opacity-40 cursor-not-allowed' : ''
              }`}
              onTouchEnd={(e) => e.currentTarget.blur()}
              onClick={() => setShowEndSessionDialog(true)}
              disabled={createNote.isPending || uploading || endSession.isPending || isRecordingAudio}
              title={isRecordingAudio ? 'Stop recording first' : 'End Session'}
            >
              <Square className="w-4 h-4 fill-current" />
            </Button>
            
            {/* End Session Dialog */}
            <EndSessionDialog
              open={showEndSessionDialog}
              onOpenChange={setShowEndSessionDialog}
              session={activeSession}
              noteText={noteText}
              onNoteTextChange={setNoteText}
              onSave={handleSaveNoteAndEndSession}
              isSaving={createNote.isPending || endSession.isPending}
            />
          </div>
          </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}