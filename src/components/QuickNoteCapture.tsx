import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useCreateNote } from '@/hooks/useNotes';
import { useProjects } from '@/hooks/useProjects';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { useCurrentFocusEntry } from '@/hooks/useDailyFocus';
import { AudioRecorder } from '@/components/AudioRecorder';
import { AudioFileItem } from '@/components/AudioFileItem';
import { MediaUploadButton } from '@/components/MediaUploadButton';
import { RichTextarea } from '@/components/RichTextarea';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { X, Send, Folder, Lock, Users, ChevronDown, ChevronRight, Music, Settings, Crosshair } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AudioFileWithName } from '@/types';

export function QuickNoteCapture() {
  const { profile } = useAuth();
  const { data: projects } = useProjects();
  const { data: currentFocus } = useCurrentFocusEntry();
  const createNote = useCreateNote();
  const { uploadAudio, uploadImage, uploadFile, uploading } = useMediaUpload();

  const [isOpen, setIsOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [audioFiles, setAudioFiles] = useState<AudioFileWithName[]>([]);
  const [imageFiles, setImageFiles] = useState<string[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [visibility, setVisibility] = useState<'private' | 'friends'>('friends');
  const [attachFocus, setAttachFocus] = useState(true);

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

  const handleSaveNote = () => {
    createNote.mutate(
      {
        authorId: profile.id,
        textContent: noteText,
        audioFiles: audioFiles.map(a => a.url),
        audioFileNames: audioFiles.map(a => a.name),
        imageFiles,
        tags: [],
        projectId: selectedProjectId || undefined,
        visibility,
        // Attach focus if toggle is on and focus exists
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
          setVisibility('friends');
          setAttachFocus(true);
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
          <button className="w-full p-4 flex items-center justify-between transition-colors rounded-lg group">
            <div className="flex items-center gap-2">
              <Music className={`w-5 h-5 transition-colors ${isOpen ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`} />
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
          {/* Compact toolbar row: Settings, Upload, Project, Focus toggle */}
          <TooltipProvider delayDuration={1000}>
            <div className="flex items-center gap-2 flex-wrap">
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
                  <TooltipContent>Visibility settings</TooltipContent>
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

              {/* Focus toggle - inline */}
              {currentFocus && currentFocus.focus_text && (
                <div className="flex items-center gap-2 ml-auto">
                  <Crosshair className={`w-4 h-4 ${attachFocus ? 'text-primary' : 'text-muted-foreground'}`} />
                  <Label htmlFor="attach-focus" className="text-xs cursor-pointer text-muted-foreground">
                    Focus
                  </Label>
                  <Switch
                    id="attach-focus"
                    checked={attachFocus}
                    onCheckedChange={setAttachFocus}
                    className="scale-90"
                  />
                </div>
              )}
            </div>
          </TooltipProvider>

          {/* Text Content */}
          <RichTextarea
            placeholder="What are you working on?"
            value={noteText}
            onChange={setNoteText}
            rows={1}
            autoExpand
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