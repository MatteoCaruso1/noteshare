import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useActiveSession, useStartSession, useEndSession, useUpdateSessionGoals } from '@/hooks/useSessions';
import { useCreateNote } from '@/hooks/useNotes';
import { useProjects } from '@/hooks/useProjects';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { BottomNav } from '@/components/BottomNav';
import { AudioRecorder } from '@/components/AudioRecorder';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, Square, Clock, Mic, Image, X, Send, Folder, Lock, Globe, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { AudioFileWithName } from '@/types';

const Practice = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { data: activeSession } = useActiveSession();
  const { data: projects } = useProjects();
  const startSession = useStartSession();
  const endSession = useEndSession();
  const updateSessionGoals = useUpdateSessionGoals();
  const createNote = useCreateNote();
  const { uploadAudio, uploadImage, uploadFile, uploading } = useMediaUpload();

  const [goals, setGoals] = useState('');
  const [noteText, setNoteText] = useState('');
  const [audioFiles, setAudioFiles] = useState<AudioFileWithName[]>([]);
  const [imageFiles, setImageFiles] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [visibility, setVisibility] = useState<'private' | 'public'>('private');
  const [currentAudioName, setCurrentAudioName] = useState('');
  const [sessionGoalsDraft, setSessionGoalsDraft] = useState('');

  useEffect(() => {
    if (activeSession) {
      setSessionGoalsDraft(activeSession.goals || '');
    } else {
      setSessionGoalsDraft('');
    }
  }, [activeSession]);

  if (!user || !profile) {
    navigate('/auth');
    return null;
  }

  const handleStartSession = () => {
    startSession.mutate({ userId: profile.id, goals });
    setGoals('');
  };

  const handleEndSession = () => {
    if (activeSession) {
      endSession.mutate({ sessionId: activeSession.id });
    }
  };

  const handleAudioRecorded = async (blob: Blob) => {
    const url = await uploadAudio(blob, profile.id);
    if (url) {
      const name = currentAudioName.trim() || `Recording ${audioFiles.length + 1}`;
      setAudioFiles([...audioFiles, { url, name }]);
      setCurrentAudioName('');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = await uploadImage(file, profile.id);
      if (url) {
        setImageFiles([...imageFiles, url]);
      }
    }
  };

  const handleAudioFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = await uploadFile(file, profile.id, 'audio');
      if (url) {
        const name = currentAudioName.trim() || file.name || `Recording ${audioFiles.length + 1}`;
        setAudioFiles([...audioFiles, { url, name }]);
        setCurrentAudioName('');
      }
    }
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
    // Save note if there's content
    if (noteText || audioFiles.length > 0 || imageFiles.length > 0) {
      createNote.mutate(
        {
          authorId: profile.id,
          textContent: noteText,
          audioFiles: audioFiles.map(a => a.url),
          imageFiles,
          tags,
          sessionId: activeSession?.id,
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
            setVisibility('private');
            // End session after note is saved
            if (activeSession) {
              endSession.mutate({ sessionId: activeSession.id });
            }
          },
        }
      );
    } else {
      // No content, just end session
      if (activeSession) {
        endSession.mutate({ sessionId: activeSession.id });
      }
    }
  };

  const sessionDuration = activeSession
    ? formatDistanceToNow(new Date(activeSession.started_at), { addSuffix: false })
    : null;

  const hasContent = noteText || audioFiles.length > 0 || imageFiles.length > 0;

  const handleUpdateSessionGoals = () => {
    if (activeSession) {
      updateSessionGoals.mutate({ sessionId: activeSession.id, goals: sessionGoalsDraft });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container max-w-2xl mx-auto px-4 py-4">
          <h1 className="text-xl font-semibold">Practice</h1>
        </div>
      </header>

      <main className="container max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Session Control */}
        <Card className="p-6 bg-card border-border">
          {activeSession ? (
            <div className="space-y-4">
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
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Session goals</p>
                <Textarea
                  placeholder="What are you focusing on this session?"
                  value={sessionGoalsDraft}
                  onChange={(e) => setSessionGoalsDraft(e.target.value)}
                  className="resize-none"
                  rows={2}
                />
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleUpdateSessionGoals}
                    disabled={updateSessionGoals.isPending}
                  >
                    Save goals
                  </Button>
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
              <Textarea
                placeholder="What do you want to work on today? (optional)"
                value={goals}
                onChange={(e) => setGoals(e.target.value)}
                className="resize-none"
                rows={2}
              />
              <Button
                className="w-full bg-gradient-primary text-primary-foreground"
                onClick={handleStartSession}
                disabled={startSession.isPending}
              >
                <Play className="w-4 h-4 mr-2" />
                Start Session
              </Button>
            </div>
          )}
        </Card>

        {/* Note Capture - Only shown when session is active */}
        {activeSession && (
          <Card className="p-6 bg-card border-border">
            <h2 className="text-lg font-semibold mb-4">Capture Session Notes</h2>

            {/* Visibility Toggle */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-muted-foreground">Visibility</span>
              <Select value={visibility} onValueChange={(v) => setVisibility(v as 'private' | 'public')}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">
                    <div className="flex items-center gap-2">
                      <Lock className="w-3 h-3" /> Private
                    </div>
                  </SelectItem>
                  <SelectItem value="public">
                    <div className="flex items-center gap-2">
                      <Globe className="w-3 h-3" /> Public
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
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

            {/* Text Content */}
            <Textarea
              placeholder="What did you practice? Any insights or breakthroughs?"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              className="resize-none mb-4"
              rows={4}
            />

            {/* Audio Recording with Name */}
            <div className="mb-4 space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Name this recording (optional)"
                  value={currentAudioName}
                  onChange={(e) => setCurrentAudioName(e.target.value)}
                  className="flex-1"
                />
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={handleAudioFileUpload}
                    className="hidden"
                  />
                  <div className="flex items-center gap-2 px-3 py-2 bg-secondary/50 rounded-lg hover:bg-secondary/70 transition-colors">
                    <Mic className="w-4 h-4" />
                    <span className="text-sm">Upload Audio</span>
                  </div>
                </label>
              </div>
              <AudioRecorder onRecorded={handleAudioRecorded} />
            </div>

            {/* Uploaded Audio Files */}
            {audioFiles.length > 0 && (
              <div className="mb-4 space-y-2">
                {audioFiles.map((audio, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-secondary/50 rounded-lg">
                    <Mic className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="text-sm font-medium min-w-0 truncate">{audio.name}</span>
                    <audio src={audio.url} controls className="flex-1 h-8" />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setAudioFiles(audioFiles.filter((_, idx) => idx !== i))}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Image Upload */}
            <div className="flex gap-2 mb-4">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <div className="flex items-center gap-2 px-3 py-2 bg-secondary/50 rounded-lg hover:bg-secondary/70 transition-colors">
                  <Image className="w-4 h-4" />
                  <span className="text-sm">Add Image</span>
                </div>
              </label>
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
      </main>

      <BottomNav />
    </div>
  );
};

export default Practice;