import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCreateNote } from '@/hooks/useNotes';
import { useProjects } from '@/hooks/useProjects';
import { useGoals } from '@/hooks/useGoals';
import { useMyPromoPosts } from '@/hooks/usePromoPosts';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { useCurrentFocusEntry, readFocusCache } from '@/hooks/useDailyFocus';
import { useActiveSession } from '@/hooks/useSessions';
import { useShareEducation } from '@/contexts/ShareEducationContext';
import { useHomescreenPromptTrigger } from '@/components/AddToHomescreenPrompt';
import { useMilestoneToasts } from '@/hooks/useMilestoneToasts';

import { usePersistentNoteState } from '@/hooks/usePersistentNoteState';
import { useDailyNoteLimit } from '@/hooks/useDailyNoteLimit';
import { useGlint } from '@/contexts/GlintContext';
import { AudioRecorder, clearRecordingBackup } from '@/components/AudioRecorder';
import { AudioFileItem } from '@/components/AudioFileItem';
import { MediaUploadButton } from '@/components/MediaUploadButton';
import { RichTextarea } from '@/components/RichTextarea';
import { LinkToPicker } from '@/components/LinkToPicker';
import { Metronome } from '@/components/Metronome';
import { PracticeTimer } from '@/components/PracticeTimer';
import { RecordingRecoveryBanner } from '@/components/RecordingRecoveryBanner';

import { SignedImage } from '@/components/SignedImage';
import { ImagePreviewDialog } from '@/components/ImagePreviewDialog';
import { DailyLimitBanner } from '@/components/DailyLimitBanner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { X, Save, Lock, Users, ChevronDown, ChevronRight, Music, Settings, ListTodo } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { uploadVideoToStorage, uploadVideoThumbnail } from '@/lib/videoUpload';

// Get today's date as YYYY-MM-DD in local timezone
function getTodayLocalDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function QuickNoteCapture() {
  const { profile, user } = useAuth();
  const { data: projects } = useProjects();
  const { data: goals } = useGoals(profile?.id);
  const { data: gigs } = useMyPromoPosts(profile?.id);
  const { data: currentFocus } = useCurrentFocusEntry();
  const { data: activeSession } = useActiveSession(profile?.id);
  const { checkAndTrigger } = useShareEducation();
  const { triggerPrompt: triggerHomescreenPrompt } = useHomescreenPromptTrigger();
  const { checkNoteMilestones } = useMilestoneToasts();
  
  const handleNoteCreated = useCallback((noteId: string, totalCount: number) => {
    checkAndTrigger(noteId, totalCount);
    triggerHomescreenPrompt(totalCount);
    checkNoteMilestones(totalCount);
  }, [checkAndTrigger, triggerHomescreenPrompt, checkNoteMilestones]);
  
  const createNote = useCreateNote(handleNoteCreated);
  const { uploadAudio, uploadImage, uploadFile, uploading } = useMediaUpload();
  
  const { setQuickNoteExpanded } = useGlint();
  const { hasReachedLimit, notesPostedToday, dailyLimit, incrementCount, isPremium } = useDailyNoteLimit();

  const [isOpen, setIsOpen] = useState(false);
  const [attachFocus, setAttachFocus] = useState(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [privateAudioIndices, setPrivateAudioIndices] = useState<number[]>([]);
  const videoBlobRef = useRef<Blob | null>(null);
  const videoNameRef = useRef('');

  const handleToggleAudioPrivacy = useCallback((index: number) => {
    setPrivateAudioIndices(prev => {
      if (prev.includes(index)) {
        toast('Recording set to public');
        return prev.filter(i => i !== index);
      } else {
        toast('Recording set to private');
        return [...prev, index];
      }
    });
  }, []);
  
  // Simply hide when there's an active session - no complex animation state
  const hasActiveSession = !!activeSession;

  // Sync isOpen state with glint context
  useEffect(() => {
    setQuickNoteExpanded(isOpen);
  }, [isOpen, setQuickNoteExpanded]);
  
  // Close collapsible when session starts
  useEffect(() => {
    if (hasActiveSession && isOpen) {
      setIsOpen(false);
    }
  }, [hasActiveSession, isOpen]);

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
  } = usePersistentNoteState('quick_note', profile?.id);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  if (!profile) return null;
  
  // Simply don't render when there's an active session
  if (hasActiveSession) {
    return null;
  }

  const handleAudioRecorded = async (blob: Blob, duration: number, backupId?: string) => {
    const url = await uploadAudio(blob, profile.id);
    if (url) {
      setAudioFiles([...audioFiles, { url, name: '', duration }]);
      // Clear backup on successful upload
      if (backupId) {
        await clearRecordingBackup(backupId);
      }
      toast.success('Recording saved!');
    } else {
      toast.error('Failed to save recording. Check the recovery banner to retry.');
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

  const handleSaveNote = async () => {
    if (hasReachedLimit) {
      toast.error('Daily note limit reached. Try Pro for Free for unlimited notes.');
      return;
    }
    
    // Determine projectId and goalId based on selectedLink
    const projectId = selectedLink?.type === 'project' ? selectedLink.id : undefined;
    const goalId = selectedLink?.type === 'goal' ? selectedLink.id : undefined;
    const gigId = selectedLink?.type === 'gig' ? selectedLink.id : undefined;
    
    // Resolve focus data: use hook data first, fall back to localStorage cache
    const focusData = attachFocus ? (currentFocus || readFocusCache(profile?.id)) : null;

    // Upload video + thumbnail BEFORE creating note
    let videoPath: string | undefined;
    let videoThumbnailPath: string | undefined;
    if (videoBlobRef.current && user?.id) {
      toast.loading('Uploading video…', { id: 'video-upload' });
      const [path, thumbBlob] = await Promise.all([
        uploadVideoToStorage(videoBlobRef.current, user.id),
        import('@/components/AudioRecorder').then(m => m.generateVideoThumbnailBlob(videoBlobRef.current!)),
      ]);
      if (path) {
        videoPath = path;
        if (thumbBlob) {
          videoThumbnailPath = await uploadVideoThumbnail(thumbBlob, user.id) || undefined;
        }
      }
      toast.dismiss('video-upload');
      if (path) {
        videoBlobRef.current = null;
        videoNameRef.current = '';
      } else {
        toast.error('Video upload failed. Note will be saved without video.');
      }
    }
    
    createNote.mutate(
      {
        authorId: profile.id,
        textContent: noteText,
        audioFiles: audioFiles.map(a => a.url),
        audioFileNames: audioFiles.map(a => a.name),
        imageFiles,
        tags,
        projectId,
        goalId,
        gigId,
        visibility,
        privateAudioIndices,
        videoPath,
        videoName: videoNameRef.current || undefined,
        videoThumbnailPath,
        // Attach focus if toggle is on and focus data is available
        focusEntryId: focusData ? focusData.id : undefined,
        focusDate: focusData ? getTodayLocalDate() : undefined,
        focusTextSnapshot: focusData ? focusData.focus_text : undefined,
        focusTitleSnapshot: focusData?.focus_title || undefined,
      },
      {
        onSuccess: async (newNote) => {
          incrementCount();
          
          clearState();
          setPrivateAudioIndices([]);
          setIsOpen(false);
        },
      }
    );
  };

  const hasContent = noteText || audioFiles.length > 0 || imageFiles.length > 0 || !!videoBlobRef.current;

  return (
    <Card className="bg-card border-border">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <button 
            className="w-full px-3 py-4 sm:px-4 flex items-center justify-between transition-colors rounded-lg group touch-manipulation"
          >
            <div className="flex items-center gap-2">
              <Music className={`w-5 h-5 transition-colors ${isOpen ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`} />
              <h2 className="font-semibold">Capture Quick Note</h2>
            </div>
            {isOpen ? (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            )}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="px-3 sm:px-4 pb-4 space-y-4">
          {/* Recovery banner for orphaned recordings */}
          <RecordingRecoveryBanner />
          
          {/* Show daily limit banner if limit reached */}
          {hasReachedLimit && (
            <DailyLimitBanner notesPostedToday={notesPostedToday} dailyLimit={dailyLimit} />
          )}
          
          {/* Compact toolbar row: Settings (with upload), Link to Goals, Metronome, Timer */}
          <TooltipProvider delayDuration={1000}>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Settings (includes visibility + media upload) */}
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

              {/* Focus toggle - inline, show if focus exists with text */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className="flex items-center gap-2 ml-auto cursor-pointer touch-manipulation select-none"
                    data-no-hover-reset
                    onTouchEnd={(e) => { e.currentTarget.blur(); }}
                  >
                    <ListTodo className={`w-4 h-4 ${attachFocus ? 'text-primary' : 'text-muted-foreground'}`} />
                    <Switch
                      id="attach-focus"
                      checked={attachFocus}
                      data-no-hover-reset
                      onCheckedChange={(checked) => {
                        setAttachFocus(checked);
                        if (checked) {
                          toast.success("Your note will be linked to Practice Routine");
                        } else {
                          toast.success("Your note will no longer be linked to Practice Routine");
                        }
                      }}
                      className="scale-90"
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent>Link to Practice Routine</TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>

          {/* Text Content */}
          <RichTextarea
            placeholder="What ideas do you want to save?"
            value={noteText}
            onChange={setNoteText}
            showTips
          />

          {/* Action Buttons - inline */}
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex-[1]">
                  <AudioRecorder 
                    onRecorded={handleAudioRecorded} 
                    onRecordingChange={setIsRecordingAudio}
                    onVideoReady={(blob) => { videoBlobRef.current = blob; }}
                    onVideoDiscarded={() => { videoBlobRef.current = null; }}
                    userId={profile.id}
                    className="w-full" 
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>Record audio</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  className={`h-9 flex-[3] bg-gradient-primary text-primary-foreground transition-opacity ${
                    isRecordingAudio ? 'opacity-40 cursor-not-allowed' : ''
                  }`}
                  onClick={handleSaveNote}
                  disabled={createNote.isPending || uploading || !hasContent || isRecordingAudio}
                  title={isRecordingAudio ? 'Stop recording first' : 'Save note'}
                >
                  <Save className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{isRecordingAudio ? 'Stop recording first' : 'Save note'}</TooltipContent>
            </Tooltip>
          </div>

          {/* Uploaded Audio Files - with editable names */}
          {audioFiles.length > 0 && (
            <div className="space-y-2">
              {audioFiles.map((audio, i) => (
                <AudioFileItem
                  key={i}
                  audio={audio}
                  onRemove={() => {
                    setAudioFiles(audioFiles.filter((_, idx) => idx !== i));
                    setPrivateAudioIndices(prev => 
                      prev.filter(idx => idx !== i).map(idx => idx > i ? idx - 1 : idx)
                    );
                  }}
                  onRename={(newName) => handleRenameAudio(i, newName)}
                  isPrivate={privateAudioIndices.includes(i)}
                  onTogglePrivacy={() => handleToggleAudioPrivacy(i)}
                />
              ))}
            </div>
          )}


          {/* Uploaded Images */}
           {imageFiles.length > 0 && (
            <div className="flex flex-wrap gap-2">
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
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}