import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCreateNote } from '@/hooks/useNotes';
import { useProjects } from '@/hooks/useProjects';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { AudioRecorder } from '@/components/AudioRecorder';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mic, Image, X, Send, Folder, Lock, Globe, ChevronDown, ChevronUp } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export function QuickNoteCapture() {
  const { profile } = useAuth();
  const { data: projects } = useProjects();
  const createNote = useCreateNote();
  const { uploadAudio, uploadImage, uploading } = useMediaUpload();

  const [isOpen, setIsOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [audioFiles, setAudioFiles] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [visibility, setVisibility] = useState<'private' | 'public'>('private');

  if (!profile) return null;

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
          setIsOpen(false);
        },
      }
    );
  };

  const hasContent = noteText || audioFiles.length > 0 || imageFiles.length > 0;

  return (
    <Card className="p-4 bg-card border-border">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            <span className="flex items-center gap-2">
              <Send className="w-4 h-4" />
              Capture a Quick Note
            </span>
            {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4 space-y-4">
          {/* Visibility Toggle */}
          <div className="flex items-center justify-between">
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

          {/* Text Content */}
          <Textarea
            placeholder="What's on your mind?"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            className="resize-none"
            rows={3}
          />

          {/* Audio Recording */}
          <AudioRecorder onRecorded={handleAudioRecorded} />

          {/* Uploaded Audio Files */}
          {audioFiles.length > 0 && (
            <div className="space-y-2">
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
          <div className="flex gap-2">
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