import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, X } from 'lucide-react';
import { useMediaUpload } from '@/hooks/useMediaUpload';

interface AddNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    textContent?: string;
    audioFiles: string[];
    videoFiles: string[];
    imageFiles: string[];
  }) => void;
  isSubmitting?: boolean;
  title?: string;
  contextLabel?: string;
  profileId: string;
}

export const AddNoteDialog = ({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting = false,
  title = 'Add Note',
  contextLabel = 'this collection',
  profileId,
}: AddNoteDialogProps) => {
  const { uploadFile, uploading } = useMediaUpload();
  const [noteText, setNoteText] = useState('');
  const [audioFiles, setAudioFiles] = useState<string[]>([]);
  const [videoFiles, setVideoFiles] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<string[]>([]);

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && profileId) {
      const url = await uploadFile(file, profileId, 'audio');
      if (url) {
        setAudioFiles([...audioFiles, url]);
      }
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && profileId) {
      const url = await uploadFile(file, profileId, 'video');
      if (url) {
        setVideoFiles([...videoFiles, url]);
      }
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && profileId) {
      const url = await uploadFile(file, profileId, 'image');
      if (url) {
        setImageFiles([...imageFiles, url]);
      }
    }
  };

  const handleSubmit = () => {
    onSubmit({
      textContent: noteText || undefined,
      audioFiles,
      videoFiles,
      imageFiles,
    });
    // Reset on success - parent should close the dialog
    setNoteText('');
    setAudioFiles([]);
    setVideoFiles([]);
    setImageFiles([]);
  };

  const removeFile = (type: 'audio' | 'video' | 'image', index: number) => {
    if (type === 'audio') {
      setAudioFiles(audioFiles.filter((_, i) => i !== index));
    } else if (type === 'video') {
      setVideoFiles(videoFiles.filter((_, i) => i !== index));
    } else {
      setImageFiles(imageFiles.filter((_, i) => i !== index));
    }
  };

  const hasContent = noteText || audioFiles.length > 0 || videoFiles.length > 0 || imageFiles.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="w-4 h-4 mr-1" />
          Add Note
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <Textarea
            placeholder={`Add a note about ${contextLabel}...`}
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            rows={3}
          />

          <div className="flex gap-2 flex-wrap">
            <label className="cursor-pointer flex-1 min-w-[100px]">
              <input
                type="file"
                accept="audio/*"
                onChange={handleAudioUpload}
                className="hidden"
              />
              <div className="flex items-center justify-center gap-2 px-3 py-2 bg-secondary/50 rounded-lg hover:bg-secondary/70 transition-colors text-sm">
                🎵 Audio
              </div>
            </label>
            <label className="cursor-pointer flex-1 min-w-[100px]">
              <input
                type="file"
                accept="video/*"
                onChange={handleVideoUpload}
                className="hidden"
              />
              <div className="flex items-center justify-center gap-2 px-3 py-2 bg-secondary/50 rounded-lg hover:bg-secondary/70 transition-colors text-sm">
                📹 Video
              </div>
            </label>
            <label className="cursor-pointer flex-1 min-w-[100px]">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <div className="flex items-center justify-center gap-2 px-3 py-2 bg-secondary/50 rounded-lg hover:bg-secondary/70 transition-colors text-sm">
                📷 Image
              </div>
            </label>
          </div>

          {audioFiles.length > 0 && (
            <div className="space-y-2">
              {audioFiles.map((url, i) => (
                <div key={i} className="relative">
                  <audio src={url} controls className="w-full" />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground"
                    onClick={() => removeFile('audio', i)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {videoFiles.length > 0 && (
            <div className="space-y-2">
              {videoFiles.map((url, i) => (
                <div key={i} className="relative">
                  <video src={url} controls className="w-full rounded-lg" />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground"
                    onClick={() => removeFile('video', i)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {imageFiles.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {imageFiles.map((url, i) => (
                <div key={i} className="relative">
                  <img src={url} alt="" className="w-20 h-20 object-cover rounded-lg" />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-destructive-foreground"
                    onClick={() => removeFile('image', i)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={isSubmitting || uploading || !hasContent}
          >
            {uploading ? 'Uploading...' : isSubmitting ? 'Adding...' : 'Add Note'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
