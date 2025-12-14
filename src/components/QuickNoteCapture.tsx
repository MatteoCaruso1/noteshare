import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCreateNote } from '@/hooks/useNotes';
import { useProjects } from '@/hooks/useProjects';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { AudioRecorder } from '@/components/AudioRecorder';
import { AudioFileItem } from '@/components/AudioFileItem';
import { MediaUploadButton } from '@/components/MediaUploadButton';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Send, Folder, Lock, Users, ChevronDown, ChevronRight, Music } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AudioFileWithName } from '@/types';

export function QuickNoteCapture() {
  const { profile } = useAuth();
  const { data: projects } = useProjects();
  const createNote = useCreateNote();
  const { uploadAudio, uploadImage, uploadFile, uploading } = useMediaUpload();

  const [isOpen, setIsOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [audioFiles, setAudioFiles] = useState<AudioFileWithName[]>([]);
  const [imageFiles, setImageFiles] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [visibility, setVisibility] = useState<'private' | 'friends'>('friends');

  if (!profile) return null;

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

  const handleSaveNote = () => {
    createNote.mutate(
      {
        authorId: profile.id,
        textContent: noteText,
        audioFiles: audioFiles.map(a => a.url),
        audioFileNames: audioFiles.map(a => a.name),
        imageFiles,
        tags,
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
          setVisibility('friends');
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
          <button className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors rounded-lg">
            <div className="flex items-center gap-2">
              <Music className="w-5 h-5 text-primary" />
              <h2 className="font-semibold">Capture a Quick Note</h2>
            </div>
            {isOpen ? (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            )}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="px-4 pb-4 space-y-4">
          {/* Visibility + Media Upload in same row */}
          <div className="flex items-center justify-between gap-2">
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
          )}

          {/* Text Content - supports Tab for nested bullets */}
          <Textarea
            placeholder="What's on your mind?"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Tab') {
                e.preventDefault();
                const target = e.target as HTMLTextAreaElement;
                const start = target.selectionStart;
                const end = target.selectionEnd;
                const value = target.value;
                
                const newValue = value.substring(0, start) + '  ' + value.substring(end);
                setNoteText(newValue);
                
                setTimeout(() => {
                  target.selectionStart = target.selectionEnd = start + 2;
                }, 0);
              }
            }}
            className="resize-none"
            rows={3}
          />

          {/* Audio Recording */}
          <AudioRecorder onRecorded={handleAudioRecorded} />

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
          <div>
            <div className="flex gap-2 mb-2">
              <Input
                placeholder="Add tag"
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
            disabled={createNote.isPending || uploading || !hasContent}
          >
            <Send className="w-4 h-4 mr-2" />
            Save Note
          </Button>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}