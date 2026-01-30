import { useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { RichTextarea } from '@/components/RichTextarea';
import { AudioRecorder } from '@/components/AudioRecorder';
import { AudioFileItem } from '@/components/AudioFileItem';
import { WaveformPlayer } from '@/components/WaveformPlayer';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { Save, X, Upload } from 'lucide-react';
import { toast } from 'sonner';

interface AudioFile {
  url: string;
  name: string;
  duration?: number;
}

interface GroupPostCaptureProps {
  profileId: string;
  profileAvatar?: string | null;
  profileName?: string;
  groupName: string;
  onSubmit: (data: {
    textContent?: string;
    audioFiles: string[];
    audioFileNames?: string[];
    videoFiles: string[];
    imageFiles: string[];
  }) => void;
  isSubmitting?: boolean;
}

export function GroupPostCapture({
  profileId,
  profileAvatar,
  profileName,
  groupName,
  onSubmit,
  isSubmitting = false,
}: GroupPostCaptureProps) {
  const { uploadAudio, uploadFile, uploading } = useMediaUpload();
  const [noteText, setNoteText] = useState('');
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const handleAudioRecorded = async (blob: Blob, duration: number) => {
    const url = await uploadAudio(blob, profileId);
    if (url) {
      setAudioFiles([...audioFiles, { url, name: '', duration }]);
    }
  };

  const handleAudioFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = await uploadFile(file, profileId, 'audio');
      if (url) {
        const name = file.name.replace(/\.[^/.]+$/, '') || '';
        setAudioFiles([...audioFiles, { url, name }]);
      }
    }
    e.target.value = '';
  };

  const handleRenameAudio = (index: number, newName: string) => {
    setAudioFiles(audioFiles.map((a, i) => i === index ? { ...a, name: newName } : a));
  };

  const handleSavePost = () => {
    onSubmit({
      textContent: noteText || undefined,
      audioFiles: audioFiles.map(a => a.url),
      audioFileNames: audioFiles.map(a => a.name),
      videoFiles: [],
      imageFiles: [],
    });
    // Reset state
    setNoteText('');
    setAudioFiles([]);
  };

  const hasContent = noteText || audioFiles.length > 0;

  return (
    <Card className="bg-card border-border p-4 space-y-4">
      {/* Avatar and text input */}
      <div className="flex items-start gap-3">
        <Avatar className="w-10 h-10 shrink-0">
          <AvatarImage src={profileAvatar || undefined} />
          <AvatarFallback>{profileName?.charAt(0) || '?'}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <RichTextarea
            placeholder={`Share something with ${groupName}...`}
            value={noteText}
            onChange={setNoteText}
            className="min-h-[60px]"
          />
        </div>
      </div>

      {/* Audio Files Preview */}
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

      {/* Hidden file input */}
      <input
        ref={audioInputRef}
        type="file"
        accept="audio/*"
        onChange={handleAudioFileUpload}
        className="hidden"
      />

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <AudioRecorder 
            onRecorded={handleAudioRecorded} 
            onRecordingChange={setIsRecordingAudio}
            className="w-full" 
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9"
          onClick={() => audioInputRef.current?.click()}
          disabled={uploading || isRecordingAudio}
          title="Upload audio file"
        >
          <Upload className="w-4 h-4" />
        </Button>
        <Button
          size="icon"
          className={`h-9 w-9 bg-primary text-primary-foreground transition-opacity ${
            isRecordingAudio ? 'opacity-40 cursor-not-allowed' : ''
          }`}
          onClick={handleSavePost}
          disabled={isSubmitting || uploading || !hasContent || isRecordingAudio}
          title={isRecordingAudio ? 'Stop recording first' : 'Post'}
        >
          <Save className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
}