import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { RichTextarea } from '@/components/RichTextarea';
import { AudioRecorder } from '@/components/AudioRecorder';
import { AudioFileItem } from '@/components/AudioFileItem';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { useSignedUrl } from '@/hooks/useSignedUrl';
import { Save } from 'lucide-react';

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
    <Card className="bg-card border-border p-3">
      {/* Main input row: Avatar + Text + Buttons */}
      <div className="flex items-center gap-3">
        <Avatar className="w-10 h-10 shrink-0">
          <AvatarImage src={avatarUrl || undefined} />
          <AvatarFallback>{profileName?.charAt(0) || '?'}</AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <RichTextarea
            placeholder={`Share something with ${groupName}...`}
            value={noteText}
            onChange={setNoteText}
            className="min-h-[44px]"
          />
        </div>

        {/* Record and Save buttons on far right */}
        <div className="flex items-center gap-2 shrink-0">
          <AudioRecorder 
            onRecorded={handleAudioRecorded} 
            onRecordingChange={setIsRecordingAudio}
            className="[&>button]:w-9 [&>button]:flex-none"
          />
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