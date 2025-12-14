import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useActiveSession, useStartSession, useEndSession, useRecentSessionNotes } from '@/hooks/useSessions';
import { useCreateNote } from '@/hooks/useNotes';
import { useProjects } from '@/hooks/useProjects';
import { useGoals, useIncrementProgress } from '@/hooks/useGoals';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { AudioRecorder } from '@/components/AudioRecorder';
import { AudioFileItem } from '@/components/AudioFileItem';
import { MediaUploadButton } from '@/components/MediaUploadButton';
import { OfflineSessionInput } from '@/components/OfflineSessionInput';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, Square, Clock, X, Folder, Lock, Users, Target } from 'lucide-react';
import { formatDistanceToNow, differenceInMinutes } from 'date-fns';
import { AudioFileWithName } from '@/types';

export function PracticeControls() {
  const { profile } = useAuth();
  const { data: activeSession } = useActiveSession();
  const { data: projects } = useProjects();
  const { data: goals } = useGoals(profile?.id);
  const { data: recentNotes } = useRecentSessionNotes(profile?.id);
  const startSession = useStartSession();
  const endSession = useEndSession();
  const createNote = useCreateNote();
  const incrementProgress = useIncrementProgress();
  const { uploadAudio, uploadImage, uploadFile, uploading } = useMediaUpload();

  const [noteText, setNoteText] = useState('');
  const [audioFiles, setAudioFiles] = useState<AudioFileWithName[]>([]);
  const [imageFiles, setImageFiles] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedGoalId, setSelectedGoalId] = useState<string>('');
  const [visibility, setVisibility] = useState<'private' | 'friends'>('friends');

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

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
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
                tags,
                sessionId: activeSession.id,
                projectId: selectedProjectId || undefined,
                visibility,
              },
              {
                onSuccess: () => {
                  setNoteText('');
                  setAudioFiles([]);
                  setImageFiles([]);
                  setTags([]);
                  setSelectedProjectId('');
                  setSelectedGoalId('');
                  setVisibility('friends');
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

          {/* Visibility + Media Upload in same row */}
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Visibility:</span>
              <Select value={visibility} onValueChange={(v) => setVisibility(v as 'private' | 'friends')}>
                <SelectTrigger className="w-28 h-8">
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
            <MediaUploadButton
              onAudioUpload={handleAudioFileUpload}
              onImageUpload={handleImageUpload}
              uploading={uploading}
            />
          </div>

          {/* Project Selection */}
          {projects && projects.length > 0 && (
            <div className="mb-4">
              <Select value={selectedProjectId || "none"} onValueChange={(v) => setSelectedProjectId(v === "none" ? "" : v)}>
                <SelectTrigger>
                  <div className="flex items-center gap-2">
                    <Folder className="w-4 h-4 text-muted-foreground" />
                    <SelectValue placeholder="Link to a project (optional)" />
                  </div>
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
            </div>
          )}

          {/* Goal Linking */}
          {goals && goals.filter(g => !g.is_completed).length > 0 && (
            <div className="mb-4">
              <Select value={selectedGoalId || "none"} onValueChange={(v) => setSelectedGoalId(v === "none" ? "" : v)}>
                <SelectTrigger>
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-muted-foreground" />
                    <SelectValue placeholder="Link to a goal (optional)" />
                  </div>
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
                <p className="text-xs text-muted-foreground mt-1">
                  Session duration will auto-add to this goal's progress
                </p>
              )}
            </div>
          )}
          {recentNotes && recentNotes.length > 0 && !noteText && (
            <div className="mb-3">
              <p className="text-xs text-muted-foreground mb-2">Quick fill from recent sessions:</p>
              <div className="flex flex-wrap gap-2">
                {recentNotes.slice(0, 3).map((suggestion, i) => (
                  <Badge
                    key={i}
                    variant="outline"
                    className="cursor-pointer hover:bg-secondary/50 transition-colors text-xs"
                    onClick={() => setNoteText(suggestion)}
                  >
                    {suggestion.length > 40 ? suggestion.substring(0, 40) + '...' : suggestion}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Text Content - supports Tab for nested bullets */}
          <Textarea
            placeholder="What did you practice? Any insights or breakthroughs?"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Tab') {
                e.preventDefault();
                const target = e.target as HTMLTextAreaElement;
                const start = target.selectionStart;
                const end = target.selectionEnd;
                const value = target.value;
                
                // Insert tab character (or spaces for indentation)
                const newValue = value.substring(0, start) + '  ' + value.substring(end);
                setNoteText(newValue);
                
                // Move cursor after the inserted spaces
                setTimeout(() => {
                  target.selectionStart = target.selectionEnd = start + 2;
                }, 0);
              }
            }}
            className="resize-none mb-4"
            rows={4}
          />

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

          {/* Combined Upload Button */}
          <div className="mb-4">
            <MediaUploadButton
              onAudioUpload={handleAudioFileUpload}
              onImageUpload={handleImageUpload}
              uploading={uploading}
            />
          </div>

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

          {/* Tags */}
          <div className="mb-4">
            <div className="flex gap-2 mb-2">
              <Input
                placeholder="Add tag (e.g., scales, chord voicings)"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                className="flex-1"
              />
              <Button variant="outline" onClick={handleAddTag}>
                Add
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() => handleRemoveTag(tag)}
                  >
                    {tag}
                    <X className="w-3 h-3 ml-1" />
                  </Badge>
                ))}
              </div>
            )}
          </div>

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