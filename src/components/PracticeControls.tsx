import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useActiveSession, useStartSession, useEndSession, useRecentSessionNotes, usePauseSession, useResumeSession, useDeleteSession } from '@/hooks/useSessions';
import { useCreateNote } from '@/hooks/useNotes';
import { useProjects } from '@/hooks/useProjects';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { useCurrentFocusEntry } from '@/hooks/useDailyFocus';
import { useRecentTags } from '@/hooks/useRecentTags';
import { usePersistentNoteState } from '@/hooks/usePersistentNoteState';
import { AudioRecorder } from '@/components/AudioRecorder';
import { AudioFileItem } from '@/components/AudioFileItem';
import { MediaUploadButton } from '@/components/MediaUploadButton';
import { OfflineSessionInput } from '@/components/OfflineSessionInput';
import { RichTextEditor } from '@/components/RichTextEditor';
import { TagInput } from '@/components/TagInput';
import { SignedImage } from '@/components/SignedImage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Play, Square, Clock, X, Folder, Lock, Users, Settings, Crosshair, Pause, ChevronDown, ChevronRight, Smartphone, Trash2, LockOpen } from 'lucide-react';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

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
  const { data: activeSession } = useActiveSession(profile?.id);
  const { data: projects } = useProjects();
  const { data: recentNotes } = useRecentSessionNotes(profile?.id);
  const { data: currentFocus } = useCurrentFocusEntry();
  const recentTags = useRecentTags();
  const startSession = useStartSession();
  const endSession = useEndSession();
  const deleteSession = useDeleteSession();
  const pauseSession = usePauseSession();
  const resumeSession = useResumeSession();
  const createNote = useCreateNote();
  const { uploadAudio, uploadImage, uploadFile, uploading } = useMediaUpload();

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
    selectedProjectId,
    setSelectedProjectId,
    visibility,
    setVisibility,
    clearState,
  } = usePersistentNoteState('practice_session', profile?.id);

  const [attachFocus, setAttachFocus] = useState(true);
  const [wakeLockEnabled, setWakeLockEnabled] = useState(false);
  const [showSessionChoice, setShowSessionChoice] = useState(false);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  // Wake lock management
  const requestWakeLock = useCallback(async () => {
    if ('wakeLock' in navigator) {
      try {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
        setWakeLockEnabled(true);
        toast.success('Screen will stay unlocked');
        
        wakeLockRef.current.addEventListener('release', () => {
          setWakeLockEnabled(false);
        });
      } catch (err) {
        console.error('Wake lock request failed:', err);
        toast.error('Could not keep screen unlocked');
      }
    } else {
      toast.error('Screen lock prevention not supported on this device');
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      await wakeLockRef.current.release();
      wakeLockRef.current = null;
      setWakeLockEnabled(false);
      toast.success('Screen lock resumed');
    }
  }, []);

  const toggleWakeLock = useCallback(async () => {
    if (wakeLockEnabled) {
      await releaseWakeLock();
    } else {
      await requestWakeLock();
    }
  }, [wakeLockEnabled, requestWakeLock, releaseWakeLock]);

  // Release wake lock when session ends or component unmounts
  useEffect(() => {
    if (!activeSession && wakeLockRef.current) {
      releaseWakeLock();
    }
    return () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
      }
    };
  }, [activeSession, releaseWakeLock]);
  // Live-updating timer - must be before early return
  const [, setTick] = useState(0);
  const isPaused = !!activeSession?.paused_at;
  
  useEffect(() => {
    if (!activeSession || isPaused) return;
    const interval = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(interval);
  }, [activeSession, isPaused]);

  if (!profile) return null;

  const handleStartSession = () => {
    startSession.mutate({ userId: profile.id });
  };

  const handlePauseSession = () => {
    if (activeSession) {
      pauseSession.mutate(activeSession.id);
    }
  };

  const handleResumeSession = () => {
    if (activeSession) {
      resumeSession.mutate(activeSession.id);
    }
  };

  const handleDeleteSession = () => {
    if (activeSession) {
      // Release wake lock if active
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
        wakeLockRef.current = null;
        setWakeLockEnabled(false);
      }
      // Clear form state (including localStorage)
      clearState();
      deleteSession.mutate({ sessionId: activeSession.id, userId: profile.id });
    }
  };

  const handleAudioRecorded = async (blob: Blob, duration: number) => {
    const url = await uploadAudio(blob, profile.id);
    if (url) {
      setAudioFiles([...audioFiles, { url, name: '', duration }]);
    }
  };

  const handleAudioFileUpload = async (file: File) => {
    const url = await uploadFile(file, profile.id, 'audio');
    if (url) {
      const name = file.name.replace(/\.[^/.]+$/, '') || '';
      setAudioFiles([...audioFiles, { url, name }]);
    }
  };

  const handleImageUpload = async (file: File) => {
    const url = await uploadImage(file, profile.id);
    if (url) {
      setImageFiles([...imageFiles, url]);
    }
  };

  const handleRenameAudio = (index: number, newName: string) => {
    setAudioFiles(audioFiles.map((a, i) => i === index ? { ...a, name: newName } : a));
  };

  const handleSaveNoteAndEndSession = () => {
    if (activeSession) {
      // Calculate session duration in minutes (accounting for paused time)
      const totalElapsedMs = Date.now() - new Date(activeSession.started_at).getTime();
      const pausedMs = activeSession.paused_duration_ms || 0;
      // If currently paused, add the current pause duration
      const currentPauseMs = activeSession.paused_at 
        ? Date.now() - new Date(activeSession.paused_at).getTime() 
        : 0;
      const activeDurationMs = totalElapsedMs - pausedMs - currentPauseMs;
      const sessionDurationMinutes = Math.floor(activeDurationMs / 60000);

      endSession.mutate(
        { sessionId: activeSession.id, userId: profile.id },
        {
          onSuccess: () => {
            createNote.mutate(
              {
                authorId: profile.id,
                textContent: noteText || undefined,
                audioFiles: audioFiles.map(a => a.url),
                audioFileNames: audioFiles.map(a => a.name),
                imageFiles,
                tags,
                sessionId: activeSession.id,
                projectId: selectedProjectId || undefined,
                visibility,
                focusEntryId: attachFocus && currentFocus ? currentFocus.id : undefined,
                focusDate: attachFocus && currentFocus ? getTodayLocalDate() : undefined,
                focusTextSnapshot: attachFocus && currentFocus ? currentFocus.focus_text : undefined,
              },
              {
                onSuccess: () => {
                  clearState();
                  setAttachFocus(true);
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

  // Handle practice dropdown open - show session choice instead of starting immediately
  const handlePracticeOpen = (open: boolean) => {
    if (!activeSession) {
      setShowSessionChoice(open);
    }
  };

  const handleStartLiveSession = () => {
    if (!startSession.isPending) {
      startSession.mutate({ userId: profile.id });
      setShowSessionChoice(false);
    }
  };

  // Determine if we should show the collapsible content
  const isExpanded = !!activeSession || showSessionChoice;

  return (
    <Card className="bg-card border-border">
      <Collapsible open={isExpanded} onOpenChange={handlePracticeOpen}>
        <CollapsibleTrigger asChild>
          <button className="w-full p-4 flex items-center justify-between transition-colors rounded-lg group">
            <div className="flex items-center gap-2">
              <Play className={`w-5 h-5 transition-colors ${activeSession ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`} />
              <h2 className="font-semibold">Start Practice Session</h2>
            </div>
            {isExpanded ? (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            )}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          {/* Session Choice Step - shown when no active session */}
          {!activeSession && showSessionChoice && (
            <div className="px-4 pb-4 space-y-3">
              <Button
                className="w-full bg-gradient-primary text-primary-foreground"
                onClick={handleStartLiveSession}
                disabled={startSession.isPending}
              >
                <Play className="w-4 h-4 mr-2" />
                Start Live Session
              </Button>
              <OfflineSessionInput />
            </div>
          )}

          {/* Active Session Content */}
          {activeSession && (
          <div className="px-4 pb-4 space-y-4">

          {/* Compact toolbar row: Settings, Upload, Project, Goal, Focus toggle */}
          <TooltipProvider delayDuration={1000}>
            <div className="flex items-center gap-2 flex-wrap mb-4">
              {/* Settings */}
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
                </PopoverContent>
              </Popover>

              {/* Delete Session - separate button */}
              <AlertDialog>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-muted-foreground hover:bg-muted"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Delete session</TooltipContent>
                </Tooltip>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete session?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will discard the session and any unsaved notes.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteSession}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              {/* Upload Media (icon only) */}
              <MediaUploadButton
                onAudioUpload={handleAudioFileUpload}
                onImageUpload={handleImageUpload}
                uploading={uploading}
                iconOnly
              />

              {/* Project (icon dropdown) */}
              {projects && projects.length > 0 && (
                <Popover>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <PopoverTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className={`h-8 w-8 ${selectedProjectId ? 'text-primary' : ''}`}
                        >
                          <Folder className="w-4 h-4" />
                        </Button>
                      </PopoverTrigger>
                    </TooltipTrigger>
                    <TooltipContent>Link to project</TooltipContent>
                  </Tooltip>
                  <PopoverContent className="w-48 p-2 bg-popover" align="start">
                    <Select value={selectedProjectId || "none"} onValueChange={(v) => setSelectedProjectId(v === "none" ? "" : v)}>
                      <SelectTrigger className="w-full h-8">
                        <SelectValue placeholder="No project" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No project</SelectItem>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </PopoverContent>
                </Popover>
              )}

              {/* Tags (icon dropdown) */}
              <TagInput
                tags={tags}
                onChange={setTags}
                recentTags={recentTags}
                iconOnly
              />

              {/* Wake Lock toggle - with unlock icon for clarity */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-8 w-8 ${wakeLockEnabled ? 'text-primary' : ''}`}
                    onClick={toggleWakeLock}
                  >
                    <div className="relative">
                      <Smartphone className="w-4 h-4" />
                      <LockOpen className="w-2.5 h-2.5 absolute -top-1 -right-1" />
                    </div>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {wakeLockEnabled ? 'Screen staying unlocked' : 'Keep screen unlocked'}
                </TooltipContent>
              </Tooltip>

              {/* Focus toggle - inline, show if focus exists with text */}
              {currentFocus?.focus_text && (
                <div className="flex items-center gap-2 ml-auto">
                  <Crosshair className={`w-4 h-4 ${attachFocus ? 'text-primary' : 'text-muted-foreground'}`} />
                  <Label htmlFor="attach-focus-session" className="text-xs cursor-pointer text-muted-foreground">
                    Focus
                  </Label>
                  <Switch
                    id="attach-focus-session"
                    checked={attachFocus}
                    onCheckedChange={setAttachFocus}
                    className="scale-90"
                  />
                </div>
              )}
            </div>
          </TooltipProvider>

          {/* Text Content - with list formatting support */}
          <div className="mb-4">
            <RichTextEditor
              placeholder="What are you practicing?"
              value={noteText}
              onChange={setNoteText}
              minHeight="36px"
            />
          </div>

          {/* Audio Recording */}
          <div className="mb-4">
            <AudioRecorder onRecorded={handleAudioRecorded} />
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
                  <SignedImage src={url} alt="" className="w-20 h-20 object-cover rounded-lg" />
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

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={isPaused ? handleResumeSession : handlePauseSession}
              disabled={pauseSession.isPending || resumeSession.isPending}
            >
              {isPaused ? (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Resume Session
                </>
              ) : (
                <>
                  <Pause className="w-4 h-4 mr-2" />
                  Pause Session
                </>
              )}
            </Button>
            <Button
              className="flex-1 bg-gradient-primary text-primary-foreground"
              onClick={handleSaveNoteAndEndSession}
              disabled={createNote.isPending || uploading || endSession.isPending}
            >
              <Square className="w-4 h-4 mr-2" />
              End Session
            </Button>
          </div>
          </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}