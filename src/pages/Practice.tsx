import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useActiveSession, useStartSession, useEndSession } from '@/hooks/useSessions';
import { useCreateNote } from '@/hooks/useNotes';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { BottomNav } from '@/components/BottomNav';
import { AudioRecorder } from '@/components/AudioRecorder';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Play, Square, Clock, Mic, Image, Video, X, Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

const Practice = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { data: activeSession } = useActiveSession();
  const startSession = useStartSession();
  const endSession = useEndSession();
  const createNote = useCreateNote();
  const { uploadAudio, uploadImage, uploadVideo, uploading } = useMediaUpload();

  const [goals, setGoals] = useState('');
  const [noteText, setNoteText] = useState('');
  const [audioFiles, setAudioFiles] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);

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
      setAudioFiles([...audioFiles, url]);
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

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleSaveNote = () => {
    createNote.mutate(
      {
        authorId: profile.id,
        textContent: noteText,
        audioFiles,
        imageFiles,
        tags,
        sessionId: activeSession?.id,
      },
      {
        onSuccess: () => {
          setNoteText('');
          setAudioFiles([]);
          setImageFiles([]);
          setTags([]);
        },
      }
    );
  };

  const sessionDuration = activeSession
    ? formatDistanceToNow(new Date(activeSession.started_at), { addSuffix: false })
    : null;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
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
                <Button
                  variant="destructive"
                  onClick={handleEndSession}
                  disabled={endSession.isPending}
                >
                  <Square className="w-4 h-4 mr-2" />
                  End Session
                </Button>
              </div>
              {activeSession.goals && (
                <div className="p-3 bg-secondary/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Session goals:</p>
                  <p className="text-sm">{activeSession.goals}</p>
                </div>
              )}
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

        {/* Quick Note Creation */}
        <Card className="p-6 bg-card border-border">
          <h2 className="text-lg font-semibold mb-4">Capture a Note</h2>

          {/* Text Content */}
          <Textarea
            placeholder="What did you practice? Any insights or breakthroughs?"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            className="resize-none mb-4"
            rows={4}
          />

          {/* Audio Recording */}
          <div className="mb-4">
            <AudioRecorder onRecorded={handleAudioRecorded} />
          </div>

          {/* Uploaded Audio Files */}
          {audioFiles.length > 0 && (
            <div className="mb-4 space-y-2">
              {audioFiles.map((url, i) => (
                <div key={i} className="flex items-center gap-2 p-2 bg-secondary/50 rounded-lg">
                  <Mic className="w-4 h-4 text-primary" />
                  <audio src={url} controls className="flex-1 h-8" />
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

          {/* Save Button */}
          <Button
            className="w-full bg-gradient-primary text-primary-foreground"
            onClick={handleSaveNote}
            disabled={createNote.isPending || uploading || (!noteText && audioFiles.length === 0 && imageFiles.length === 0)}
          >
            <Send className="w-4 h-4 mr-2" />
            Save Note
          </Button>
        </Card>
      </main>

      <BottomNav />
    </div>
  );
};

export default Practice;
