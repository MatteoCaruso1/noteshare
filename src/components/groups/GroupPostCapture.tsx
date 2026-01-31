import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { RichTextarea } from '@/components/RichTextarea';
import { AudioRecorder } from '@/components/AudioRecorder';
import { AudioFileItem } from '@/components/AudioFileItem';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { useSignedUrl } from '@/hooks/useSignedUrl';
import { Send } from 'lucide-react';

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
  const { uploadAudio, uploading } = useMediaUpload();
  const { signedUrl: avatarUrl } = useSignedUrl(profileAvatar);
  const [noteText, setNoteText] = useState('');
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);

  const handleAudioRecorded = async (blob: Blob, duration: number) => {
    const url = await uploadAudio(blob, profileId);
    if (url) {
      setAudioFiles([...audioFiles, { url, name: '', duration }]);
    }
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
    <Card className="bg-card border-border p-2.5">
      {/* Main input row: Avatar + Text + Buttons */}
      <div className="flex items-center gap-2">
        <Avatar className="w-7 h-7 shrink-0">
          <AvatarImage src={avatarUrl || undefined} />
          <AvatarFallback className="text-xs">{profileName?.charAt(0) || '?'}</AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <RichTextarea
            placeholder="Post something"
            value={noteText}
            onChange={setNoteText}
            className="min-h-[40px]"
          />
        </div>

        {/* Record and Save buttons on far right */}
        <div className="flex items-center gap-1.5 shrink-0">
          <AudioRecorder 
            onRecorded={handleAudioRecorded} 
            onRecordingChange={setIsRecordingAudio}
            className="[&>button]:w-7 [&>button]:h-7 [&>button]:flex-none"
          />
          <Button
            size="icon"
            className={`h-7 w-7 bg-primary text-primary-foreground transition-opacity ${
              isRecordingAudio ? 'opacity-40 cursor-not-allowed' : ''
            }`}
            onClick={handleSavePost}
            disabled={isSubmitting || uploading || !hasContent || isRecordingAudio}
            title={isRecordingAudio ? 'Stop recording first' : 'Post'}
          >
            <Send className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Audio Files Preview */}
      {audioFiles.length > 0 && (
        <div className="space-y-2 mt-3">
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
    </Card>
  );
}