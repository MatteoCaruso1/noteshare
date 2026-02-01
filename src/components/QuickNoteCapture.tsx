import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCreateNote } from '@/hooks/useNotes';
import { useProjects } from '@/hooks/useProjects';
import { useGoals } from '@/hooks/useGoals';
import { useMyPromoPosts } from '@/hooks/usePromoPosts';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { useCurrentFocusEntry } from '@/hooks/useDailyFocus';
import { useActiveSession } from '@/hooks/useSessions';

import { usePersistentNoteState } from '@/hooks/usePersistentNoteState';
import { useDailyNoteLimit } from '@/hooks/useDailyNoteLimit';
import { useGlint } from '@/contexts/GlintContext';
import { AudioRecorder } from '@/components/AudioRecorder';
import { AudioFileItem } from '@/components/AudioFileItem';
import { MediaUploadButton } from '@/components/MediaUploadButton';
import { RichTextarea } from '@/components/RichTextarea';
import { LinkToPicker } from '@/components/LinkToPicker';
import { Metronome } from '@/components/Metronome';
import { PracticeTimer } from '@/components/PracticeTimer';

import { SignedImage } from '@/components/SignedImage';
import { DailyLimitBanner } from '@/components/DailyLimitBanner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { X, Save, Lock, Users, ChevronDown, ChevronRight, Music, Settings, ClipboardList } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';

// Get today's date as YYYY-MM-DD in local timezone
function getTodayLocalDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function QuickNoteCapture() {
  const { profile } = useAuth();
  const { data: projects } = useProjects();
  const { data: goals } = useGoals(profile?.id);
  const { data: gigs } = useMyPromoPosts(profile?.id);
  const { data: currentFocus } = useCurrentFocusEntry();
  const { data: activeSession } = useActiveSession(profile?.id);
  const createNote = useCreateNote();
  const { uploadAudio, uploadImage, uploadFile, uploading } = useMediaUpload();
  
  const { setQuickNoteExpanded } = useGlint();
  const { hasReachedLimit, notesPostedToday, dailyLimit, incrementCount, isPremium } = useDailyNoteLimit();

  const [isOpen, setIsOpen] = useState(false);
  const [attachFocus, setAttachFocus] = useState(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  
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

  if (!profile) return null;
  
  // Simply don't render when there's an active session
  if (hasActiveSession) {
    return null;
  }

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

  const handleSaveNote = () => {
    if (hasReachedLimit) {
      toast.error('Daily note limit reached. Try Premium for Free for unlimited notes.');
      return;
    }
    
    // Determine projectId and goalId based on selectedLink
    const projectId = selectedLink?.type === 'project' ? selectedLink.id : undefined;
    const goalId = selectedLink?.type === 'goal' ? selectedLink.id : undefined;
    const gigId = selectedLink?.type === 'gig' ? selectedLink.id : undefined;
    
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
        // Attach focus if toggle is on and focus exists - always use today's date
        focusEntryId: attachFocus && currentFocus ? currentFocus.id : undefined,
        focusDate: attachFocus && currentFocus ? getTodayLocalDate() : undefined,
        focusTextSnapshot: attachFocus && currentFocus ? currentFocus.focus_text : undefined,
      },
      {
        onSuccess: () => {
          incrementCount(); // Update local count optimistically
          clearState();
          setIsOpen(false);
        },
      }
    );
  };

  const hasContent = noteText || audioFiles.length > 0 || imageFiles.length > 0;

  return (
    <Card className="bg-card border-border">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <button 
            className="w-full p-4 flex items-center justify-between transition-colors rounded-lg group touch-manipulation"
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
        <CollapsibleContent className="px-4 pb-4 space-y-4">
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
              {currentFocus?.focus_text && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2 ml-auto cursor-pointer">
                      <ClipboardList className={`w-4 h-4 ${attachFocus ? 'text-primary' : 'text-muted-foreground'}`} />
                      <Switch
                        id="attach-focus"
                        checked={attachFocus}
                        onCheckedChange={(checked) => {
                          setAttachFocus(checked);
                          if (checked) {
                            toast.success("Your note will be linked to Practice Board");
                          } else {
                            toast.success("Your note will no longer be linked to Practice Board");
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

          {/* Text Content */}
          <RichTextarea
            placeholder="What ideas or sounds do you want to save?"
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
                  onRemove={() => setAudioFiles(audioFiles.filter((_, idx) => idx !== i))}
                  onRename={(newName) => handleRenameAudio(i, newName)}
                />
              ))}
            </div>
          )}


          {/* Uploaded Images */}
          {imageFiles.length > 0 && (
            <div className="flex flex-wrap gap-2">
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
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}