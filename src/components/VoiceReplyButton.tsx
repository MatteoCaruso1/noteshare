import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mic, Square, Send, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { WaveformPlayer } from './WaveformPlayer';

interface VoiceReplyButtonProps {
  noteId: string;
  authorId: string;
  onSuccess: () => void;
}

export function VoiceReplyButton({ noteId, authorId, onSuccess }: VoiceReplyButtonProps) {
  const [open, setOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [replyTitle, setReplyTitle] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Could not access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleSubmit = async () => {
    if (!audioBlob) return;

    setIsUploading(true);
    try {
      // Upload audio to storage
      const fileName = `voice-reply-${Date.now()}.webm`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('practice-media')
        .upload(`voice-replies/${fileName}`, audioBlob, {
          contentType: 'audio/webm',
        });

      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage
        .from('practice-media')
        .getPublicUrl(uploadData.path);

      // Create comment with audio - use custom title or default
      const displayTitle = replyTitle.trim() || '🎤 Voice reply';
      const { error: commentError } = await supabase
        .from('note_comments')
        .insert({
          note_id: noteId,
          author_id: authorId,
          content: displayTitle,
          audio_url: publicUrl.publicUrl,
        });

      if (commentError) throw commentError;

      toast.success('Voice reply sent');
      setOpen(false);
      resetState();
      onSuccess();
    } catch (error) {
      console.error('Error sending voice reply:', error);
      toast.error('Failed to send voice reply');
    } finally {
      setIsUploading(false);
    }
  };

  const resetState = () => {
    setAudioBlob(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setIsRecording(false);
    setReplyTitle('');
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      resetState();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-primary"
          onClick={(e) => e.stopPropagation()}
        >
          <Mic className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Record Voice Reply</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {!audioUrl ? (
            <div className="flex flex-col items-center gap-4">
              <Button
                size="lg"
                variant={isRecording ? 'destructive' : 'default'}
                className="w-20 h-20 rounded-full"
                onClick={isRecording ? stopRecording : startRecording}
              >
                {isRecording ? (
                  <Square className="w-8 h-8" />
                ) : (
                  <Mic className="w-8 h-8" />
                )}
              </Button>
              <p className="text-sm text-muted-foreground">
                {isRecording ? 'Recording... Tap to stop' : 'Tap to start recording'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reply-title">Title (optional)</Label>
                <Input
                  id="reply-title"
                  placeholder="Name your voice reply..."
                  value={replyTitle}
                  onChange={(e) => setReplyTitle(e.target.value)}
                />
              </div>
              <WaveformPlayer src={audioUrl} title={replyTitle || 'Voice Reply Preview'} />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={resetState}
                  className="flex-1"
                >
                  Re-record
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isUploading}
                  className="flex-1"
                >
                  {isUploading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Send
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
