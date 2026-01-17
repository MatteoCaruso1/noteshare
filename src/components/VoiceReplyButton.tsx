import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mic, Square, Send, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { WaveformPlayer } from './WaveformPlayer';
import { audioManager } from '@/lib/audioManager';

interface VoiceReplyButtonProps {
  noteId: string;
  authorId: string;
  noteOwnerId: string;
  onSuccess: () => void;
}

// Detect Safari browser for special handling
function isSafari(): boolean {
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes('safari') && !ua.includes('chrome') && !ua.includes('chromium');
}

// Get supported mime type for mobile compatibility
function getSupportedMimeType(): string {
  // Safari works best with mp4
  if (isSafari()) {
    if (MediaRecorder.isTypeSupported('audio/mp4')) return 'audio/mp4';
    // Safari might not report support correctly, try without specifying
    return '';
  }
  
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/ogg',
    'audio/mp4',
    'audio/mpeg',
    'audio/wav',
  ];
  
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return '';
}

export function VoiceReplyButton({ noteId, authorId, noteOwnerId, onSuccess }: VoiceReplyButtonProps) {
  const [open, setOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [replyTitle, setReplyTitle] = useState('');
  const [elapsedTime, setElapsedTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Ref for Safari's requestData interval
  const safariIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = async () => {
    try {
      // Pause any playing audio before recording
      audioManager.pauseAll();
      audioManager.setRecording(true);

      const safari = isSafari();
      
      // Safari works better with simpler audio constraints
      const audioConstraints = safari 
        ? true 
        : {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          };

      const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
      streamRef.current = stream;
      
      const mimeType = getSupportedMimeType();
      
      // Safari sometimes fails with options, so try without if needed
      let mediaRecorder: MediaRecorder;
      try {
        const options: MediaRecorderOptions = mimeType ? { mimeType } : {};
        mediaRecorder = new MediaRecorder(stream, options);
      } catch (e) {
        console.warn('[VoiceReplyButton] MediaRecorder with options failed, trying without:', e);
        mediaRecorder = new MediaRecorder(stream);
      }
      
      console.log('[VoiceReplyButton] Using mimeType:', mediaRecorder.mimeType || mimeType, 'Safari:', safari);
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      startTimeRef.current = Date.now();
      setElapsedTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);

      mediaRecorder.ondataavailable = (e) => {
        console.log('[VoiceReplyButton] dataavailable, size:', e.data?.size);
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        console.log('[VoiceReplyButton] onstop, chunks:', chunksRef.current.length);
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        if (safariIntervalRef.current) {
          clearInterval(safariIntervalRef.current);
          safariIntervalRef.current = null;
        }
        
        audioManager.setRecording(false);
        
        const actualMimeType = mediaRecorder.mimeType || mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: actualMimeType });
        console.log('[VoiceReplyButton] final blob size:', blob.size, 'type:', blob.type);
        
        if (blob.size > 0) {
          setAudioBlob(blob);
          setAudioUrl(URL.createObjectURL(blob));
        } else {
          toast.error('Recording was empty. Please try again.');
        }
        
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error('[VoiceReplyButton] MediaRecorder error:', event);
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        if (safariIntervalRef.current) {
          clearInterval(safariIntervalRef.current);
          safariIntervalRef.current = null;
        }
        audioManager.setRecording(false);
        toast.error('Recording failed. Please try again.');
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        setIsRecording(false);
      };

      // Safari doesn't support timeslice well, use requestData interval instead
      if (safari) {
        mediaRecorder.start();
        safariIntervalRef.current = setInterval(() => {
          if (mediaRecorder.state === 'recording') {
            mediaRecorder.requestData();
          }
        }, 1000);
      } else {
        // Use timeslice to get data more frequently (helps with screen lock)
        mediaRecorder.start(1000);
      }
      
      setIsRecording(true);
    } catch (error) {
      console.error('[VoiceReplyButton] Error starting recording:', error);
      audioManager.setRecording(false);
      if (error instanceof Error && error.name === 'NotAllowedError') {
        toast.error('Microphone access denied. Please allow microphone permissions.');
      } else {
        toast.error('Could not access microphone. Please check permissions.');
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.error('[VoiceReplyButton] Error stopping recorder:', e);
      }
      setIsRecording(false);
    }
  };

  const handleSubmit = async () => {
    if (!audioBlob) return;

    setIsUploading(true);
    try {
      // Get the user's profile ID for the correct upload path
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', authorId)
        .single();

      if (profileError || !profile) {
        console.error('[VoiceReplyButton] Could not fetch profile:', profileError);
        throw new Error('Could not find user profile');
      }

      // Determine file extension from mime type
      const mimeType = audioBlob.type;
      let ext = 'webm';
      if (mimeType.includes('mp4')) ext = 'm4a';
      else if (mimeType.includes('ogg')) ext = 'ogg';
      else if (mimeType.includes('wav')) ext = 'wav';
      
      // Upload audio to storage with correct path structure: {profileId}/voice-replies/{filename}
      const fileName = `voice-reply-${Date.now()}.${ext}`;
      const uploadPath = `${profile.id}/voice-replies/${fileName}`;
      
      console.log('[VoiceReplyButton] Uploading to path:', uploadPath);
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('practice-media')
        .upload(uploadPath, audioBlob, {
          contentType: mimeType,
        });

      if (uploadError) {
        console.error('[VoiceReplyButton] Upload error:', uploadError);
        throw new Error(`Upload failed: ${uploadError.message}`);
      }

      // Get signed URL for private bucket
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('practice-media')
        .createSignedUrl(uploadData.path, 60 * 60 * 24 * 7); // 7 day expiry

      if (signedUrlError) {
        console.error('[VoiceReplyButton] Signed URL error:', signedUrlError);
        throw new Error(`Could not get signed URL: ${signedUrlError.message}`);
      }

      // Create comment with audio - use custom title or default
      const displayTitle = replyTitle.trim() || '🎤 Voice reply';
      const { error: commentError } = await supabase
        .from('note_comments')
        .insert({
          note_id: noteId,
          author_id: authorId,
          content: displayTitle,
          audio_url: signedUrlData.signedUrl,
        });

      if (commentError) {
        console.error('[VoiceReplyButton] Comment insert error:', commentError);
        throw new Error(`Could not save comment: ${commentError.message}`);
      }

      // Create notification for note owner (if not replying to own note)
      if (noteOwnerId && noteOwnerId !== authorId) {
        await supabase
          .from('notifications')
          .insert({
            user_id: noteOwnerId,
            type: 'comment',
            content: `sent a voice reply to your note`,
            note_id: noteId,
            from_user_id: authorId,
          });
      }

      toast.success('Voice reply sent');
      setOpen(false);
      resetState();
      onSuccess();
    } catch (error) {
      console.error('[VoiceReplyButton] Error sending voice reply:', error);
      if (error instanceof Error) {
        toast.error(`Failed to send voice reply: ${error.message}`);
      } else {
        toast.error('Failed to send voice reply');
      }
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
    setElapsedTime(0);
    
    // Cleanup any lingering stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      // Stop recording if closing dialog while recording
      if (isRecording) {
        stopRecording();
      }
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
              {isRecording && (
                <div className="flex items-center gap-2 text-destructive">
                  <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                  <span className="font-mono">{formatTime(elapsedTime)}</span>
                </div>
              )}
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
