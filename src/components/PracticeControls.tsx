import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useActiveSession, useStartSession, useEndSession, useRecentSessionNotes } from '@/hooks/useSessions';
import { useCreateNote } from '@/hooks/useNotes';
import { useProjects } from '@/hooks/useProjects';
import { useGoals, useIncrementProgress } from '@/hooks/useGoals';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { useCurrentFocusEntry } from '@/hooks/useDailyFocus';
import { AudioRecorder } from '@/components/AudioRecorder';
import { AudioFileItem } from '@/components/AudioFileItem';
import { MediaUploadButton } from '@/components/MediaUploadButton';
import { OfflineSessionInput } from '@/components/OfflineSessionInput';
import { RichTextEditor } from '@/components/RichTextEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Play, Square, Clock, X, Folder, Lock, Users, Target, Crosshair } from 'lucide-react';
import { formatDistanceToNow, differenceInMinutes } from 'date-fns';
import { AudioFileWithName } from '@/types';

export function PracticeControls() {
  const { profile } = useAuth();
  const { data: activeSession } = useActiveSession();
  const { data: projects } = useProjects();
  const { data: goals } = useGoals(profile?.id);
  const { data: recentNotes } = useRecentSessionNotes(profile?.id);
  const { data: currentFocus } = useCurrentFocusEntry();
  const startSession = useStartSession();
  const endSession = useEndSession();
  const createNote = useCreateNote();
  const incrementProgress = useIncrementProgress();
  const { uploadAudio, uploadImage, uploadFile, uploading } = useMediaUpload();

  const [noteText, setNoteText] = useState('');
  const [audioFiles, setAudioFiles] = useState<AudioFileWithName[]>([]);
  const [imageFiles, setImageFiles] = useState<string[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedGoalId, setSelectedGoalId] = useState<string>('');
  const [visibility, setVisibility] = useState<'private' | 'friends'>('friends');
  const [attachFocus, setAttachFocus] = useState(true);

  if (!profile) return null;

  const handleStartSession = () => {
    startSession.mutate({ userId: profile.id });
  };

  const handleAudioRecorded = async (blob: Blob, duration: number) => {
    const url = await uploadAudio(blob, profile.id);
    if (url) {
      const name = `Recording ${audioFiles.length + 1}`;
      setAudioFiles([...audioFiles, { url, name, duration }]);
    }
  };

  const handleAudioFileUpload = async (file: File) => {
    const url = await uploadFile(file, profile.id, 'audio');
    if (url) {
      const name = file.name.replace(/\.[^/.]+$/, '') || `Recording ${audioFiles.length + 1}`;
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
      // Calculate session duration in minutes
      const sessionDurationMinutes = differenceInMinutes(
        new Date(),
        new Date(activeSession.started_at)
      );

      endSession.mutate(
        { sessionId: activeSession.id },
        {
          onSuccess: () => {
            // If a time-based goal is linked, auto-increment its progress
            if (selectedGoalId) {
              const linkedGoal = goals?.find(g => g.id === selectedGoalId);
              if (linkedGoal && linkedGoal.progress_type === 'time' && !linkedGoal.is_completed) {
                incrementProgress.mutate({
                  goalId: selectedGoalId,
                  field: 'current_minutes',
                  amount: sessionDurationMinutes,
                });
              }
            }

            createNote.mutate(
              {
                authorId: profile.id,
                textContent: noteText || undefined,
                audioFiles: audioFiles.map(a => a.url),
                audioFileNames: audioFiles.map(a => a.name),
                imageFiles,
                tags: [],
                sessionId: activeSession.id,
                projectId: selectedProjectId || undefined,
                goalId: selectedGoalId || undefined,
                visibility,
                focusEntryId: attachFocus && currentFocus ? currentFocus.id : undefined,
                focusDate: attachFocus && currentFocus ? currentFocus.focus_date : undefined,
                focusTextSnapshot: attachFocus && currentFocus ? currentFocus.focus_text : undefined,
              },
              {
                onSuccess: () => {
                  setNoteText('');
                  setAudioFiles([]);
                  setImageFiles([]);
                  setSelectedProjectId('');
                  setSelectedGoalId('');
                  setVisibility('friends');
                  setAttachFocus(true);
                },
              }
            );
          },
        }
      );
    }
  };

  const sessionDuration = activeSession
    ? formatDistanceToNow(new Date(activeSession.started_at), { addSuffix: false })
    : null;

  return (
    <div className="space-y-4">
      {/* Session Control */}
      <Card className="p-6 bg-card border-border">
        {activeSession ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-green-500 recording-pulse" />
              <div>
                <p className="font-medium">Session Active</p>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {sessionDuration}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-lg font-semibold mb-2">Start a Practice Session</h2>
              <p className="text-sm text-muted-foreground">
                Track your practice time and capture notes as you go
              </p>
            </div>
            <Button
              className="w-full bg-gradient-primary text-primary-foreground"
              onClick={handleStartSession}
              disabled={startSession.isPending}
            >
              <Play className="w-4 h-4 mr-2" />
              Start Session
            </Button>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">or</span>
              </div>
            </div>
            
            <OfflineSessionInput />
          </div>
        )}
      </Card>

      {/* Note Capture - Only shown when session is active */}
      {activeSession && (
        <Card className="p-6 bg-card border-border">
          <h2 className="text-lg font-semibold mb-4">Capture Session Notes</h2>

          {/* Compact toolbar row: Settings, Upload, Project, Goal, Focus toggle */}
          <TooltipProvider delayDuration={1000}>
            <div className="flex items-center gap-2 flex-wrap mb-4">
              {/* Visibility (subtle icon only) */}
              <Popover>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                      <button className="p-1 rounded hover:bg-muted/50 transition-colors">
                        {visibility === 'private' ? (
                          <Lock className="w-3.5 h-3.5 text-muted-foreground/60" />
                        ) : (
                          <Users className="w-3.5 h-3.5 text-muted-foreground/60" />
                        )}
                      </button>
                    </PopoverTrigger>
                  </TooltipTrigger>
                  <TooltipContent>{visibility === 'private' ? 'Private' : 'Friends only'}</TooltipContent>
                </Tooltip>
                <PopoverContent className="w-40 p-1 bg-popover" align="start">
                  <button 
                    className={`w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-muted/50 ${visibility === 'private' ? 'text-primary' : ''}`}
                    onClick={() => setVisibility('private')}
                  >
                    <Lock className="w-3 h-3" /> Private
                  </button>
                  <button 
                    className={`w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-muted/50 ${visibility === 'friends' ? 'text-primary' : ''}`}
                    onClick={() => setVisibility('friends')}
                  >
                    <Users className="w-3 h-3" /> Friends
                  </button>
                </PopoverContent>
              </Popover>

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

              {/* Goal (icon dropdown) */}
              {goals && goals.filter(g => !g.is_completed).length > 0 && (
                <Popover>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <PopoverTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className={`h-8 w-8 ${selectedGoalId ? 'text-primary' : ''}`}
                        >
                          <Target className="w-4 h-4" />
                        </Button>
                      </PopoverTrigger>
                    </TooltipTrigger>
                    <TooltipContent>Link to goal</TooltipContent>
                  </Tooltip>
                  <PopoverContent className="w-56 p-2 bg-popover" align="start">
                    <Select value={selectedGoalId || "none"} onValueChange={(v) => setSelectedGoalId(v === "none" ? "" : v)}>
                      <SelectTrigger className="w-full h-8">
                        <SelectValue placeholder="No goal" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No goal</SelectItem>
                        {goals.filter(g => !g.is_completed).map((goal) => (
                          <SelectItem key={goal.id} value={goal.id}>
                            <div className="flex items-center gap-2">
                              <span>{goal.title || goal.content}</span>
                              {goal.progress_type === 'time' && (
                                <Badge variant="outline" className="text-xs ml-1">+time</Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedGoalId && goals?.find(g => g.id === selectedGoalId)?.progress_type === 'time' && (
                      <p className="text-xs text-muted-foreground mt-2 px-1">
                        Session time auto-adds to goal
                      </p>
                    )}
                  </PopoverContent>
                </Popover>
              )}

              {/* Focus toggle - inline */}
              {currentFocus && currentFocus.focus_text && (
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
              placeholder="What did you practice?"
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
                  <img src={url} alt="" className="w-20 h-20 object-cover rounded-lg" />
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

          {/* Save and End Session Button */}
          <Button
            className="w-full bg-gradient-primary text-primary-foreground"
            onClick={handleSaveNoteAndEndSession}
            disabled={createNote.isPending || uploading || endSession.isPending}
          >
            <Square className="w-4 h-4 mr-2" />
            Save Note and End Session
          </Button>
        </Card>
      )}
    </div>
  );
}