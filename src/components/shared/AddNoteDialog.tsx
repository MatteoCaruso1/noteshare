import { useState, useRef } from 'react';
import { ImagePreviewDialog } from '@/components/ImagePreviewDialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, X, Mic, Upload, ChevronDown } from 'lucide-react';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { AudioRecorder } from '@/components/AudioRecorder';
import { WaveformPlayer } from '@/components/WaveformPlayer';

interface AudioFile {
  url: string;
  name: string;
}

interface AddNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    textContent?: string;
    audioFiles: string[];
    audioFileNames?: string[];
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
  const { uploadFile, uploadAudio, uploading } = useMediaUpload();
  const [noteText, setNoteText] = useState('');
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [videoFiles, setVideoFiles] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [showRecorder, setShowRecorder] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  const audioInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleAudioRecorded = async (blob: Blob, duration: number) => {
    if (profileId) {
      const url = await uploadAudio(blob, profileId);
      if (url) {
        setAudioFiles([...audioFiles, { url, name: '' }]);
      }
    }
    setShowRecorder(false);
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && profileId) {
      const name = file.name.replace(/\.[^/.]+$/, '') || '';
      const url = await uploadFile(file, profileId, 'audio');
      if (url) {
        setAudioFiles([...audioFiles, { url, name }]);
      }
    }
    e.target.value = '';
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && profileId) {
      const url = await uploadFile(file, profileId, 'video');
      if (url) {
        setVideoFiles([...videoFiles, url]);
      }
    }
    e.target.value = '';
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && profileId) {
      const url = await uploadFile(file, profileId, 'image');
      if (url) {
        setImageFiles([...imageFiles, url]);
      }
    }
    e.target.value = '';
  };

  const handleSubmit = () => {
    onSubmit({
      textContent: noteText || undefined,
      audioFiles: audioFiles.map(a => a.url),
      audioFileNames: audioFiles.map(a => a.name),
      videoFiles,
      imageFiles,
    });
    // Reset on success - parent should close the dialog
    setNoteText('');
    setAudioFiles([]);
    setVideoFiles([]);
    setImageFiles([]);
    setShowRecorder(false);
  };

  const removeAudioFile = (index: number) => {
    setAudioFiles(audioFiles.filter((_, i) => i !== index));
  };

  const removeFile = (type: 'video' | 'image', index: number) => {
    if (type === 'video') {
      setVideoFiles(videoFiles.filter((_, i) => i !== index));
    } else {
      setImageFiles(imageFiles.filter((_, i) => i !== index));
    }
  };

  const hasContent = noteText || audioFiles.length > 0 || videoFiles.length > 0 || imageFiles.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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

          {/* Hidden file inputs */}
          <input
            ref={audioInputRef}
            type="file"
            accept="audio/*"
            onChange={handleAudioUpload}
            className="hidden"
          />
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            onChange={handleVideoUpload}
            className="hidden"
          />
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />

          {/* Audio Recorder - shown when user wants to record */}
          {showRecorder && (
            <div className="p-3 bg-secondary/30 rounded-lg flex items-center gap-3">
              <AudioRecorder 
                onRecorded={handleAudioRecorded}
                onRecordingChange={setIsRecording}
                className="flex-1"
              />
              {!isRecording && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowRecorder(false)}
                  className="text-muted-foreground"
                >
                  Cancel
                </Button>
              )}
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            {/* Audio: Dropdown with Record and Upload options */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="flex-1 min-w-[100px] flex items-center justify-center gap-1 px-3 py-2 bg-secondary/50 rounded-lg hover:bg-secondary/70 transition-colors text-sm cursor-pointer">
                  🎵 Audio
                  <ChevronDown className="w-3 h-3 text-muted-foreground" />
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="bg-popover">
                <DropdownMenuItem 
                  onClick={() => setShowRecorder(true)}
                  disabled={isRecording || showRecorder}
                >
                  <Mic className="w-4 h-4 mr-2" />
                  Record Audio
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => audioInputRef.current?.click()}>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Audio File
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Video upload */}
            <div 
              className="flex-1 min-w-[100px] flex items-center justify-center gap-2 px-3 py-2 bg-secondary/50 rounded-lg hover:bg-secondary/70 transition-colors text-sm cursor-pointer"
              onClick={() => videoInputRef.current?.click()}
            >
              📹 Video
            </div>

            {/* Image upload */}
            <div 
              className="flex-1 min-w-[100px] flex items-center justify-center gap-2 px-3 py-2 bg-secondary/50 rounded-lg hover:bg-secondary/70 transition-colors text-sm cursor-pointer"
              onClick={() => imageInputRef.current?.click()}
            >
              📷 Image
            </div>
          </div>

          {/* Audio previews with waveform */}
          {audioFiles.length > 0 && (
            <div className="space-y-2">
              {audioFiles.map((audio, i) => (
                <div key={i} className="relative bg-secondary/30 rounded-lg p-2">
                  {audio.name && (
                    <p className="text-xs text-muted-foreground mb-1 truncate">{audio.name}</p>
                  )}
                  <WaveformPlayer src={audio.url} />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6 rounded-full bg-destructive text-destructive-foreground"
                    onClick={() => removeAudioFile(i)}
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
                  <img
                    src={url}
                    alt=""
                    className="w-20 h-20 object-cover rounded-lg cursor-pointer"
                    onClick={() => setPreviewImage(url)}
                  />
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
          <ImagePreviewDialog
            src={previewImage}
            open={!!previewImage}
            onOpenChange={(open) => !open && setPreviewImage(null)}
            signed={false}
          />

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={isSubmitting || uploading || !hasContent || isRecording}
          >
            {uploading ? 'Uploading...' : isSubmitting ? 'Adding...' : isRecording ? 'Recording...' : 'Add Note'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
