import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Video, Square, X } from 'lucide-react';
import { toast } from 'sonner';

const MAX_DURATION = 30; // seconds

interface VideoRecorderProps {
  className?: string;
  onDiscard?: () => void;
  onVideoReady?: (blob: Blob) => void;
}

export function VideoRecorder({ className, onDiscard, onVideoReady }: VideoRecorderProps) {
  const [state, setState] = useState<'idle' | 'recording' | 'ready'>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const autoStopRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      timerRef.current && clearInterval(timerRef.current);
      autoStopRef.current && clearTimeout(autoStopRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
      previewUrl && URL.revokeObjectURL(previewUrl);
    };
  }, []);

  // Auto-start recording on mount
  useEffect(() => {
    startRecording();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : MediaRecorder.isTypeSupported('video/webm')
          ? 'video/webm'
          : 'video/mp4';

      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(stream, { mimeType });
      } catch {
        recorder = new MediaRecorder(stream);
      }

      chunksRef.current = [];
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        timerRef.current && clearInterval(timerRef.current);
        autoStopRef.current && clearTimeout(autoStopRef.current);
        stopTracks();

        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'video/webm' });
        if (blob.size === 0) {
          toast.error('Video recording failed — no data captured.');
          setState('idle');
          return;
        }

        // Revoke old preview
        if (previewUrl) URL.revokeObjectURL(previewUrl);

        const url = URL.createObjectURL(blob);
        setVideoBlob(blob);
        setPreviewUrl(url);
        setState('ready');
        onVideoReady?.(blob);
        console.log(`[VideoRecorder] Recorded ${(blob.size / 1024).toFixed(0)}KB, type: ${blob.type}`);
      };

      recorder.onerror = (event) => {
        console.error('[VideoRecorder] error:', event);
        stopTracks();
        setState('idle');
        toast.error('Video recording error.');
      };

      recorder.start(1000); // 1s chunks
      setElapsed(0);
      setState('recording');

      timerRef.current = setInterval(() => {
        setElapsed(prev => prev + 1);
      }, 1000);

      autoStopRef.current = setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
      }, MAX_DURATION * 1000);

    } catch (err) {
      console.error('[VideoRecorder] Permission error:', err);
      toast.error('Camera access required to record video.');
      onDiscard?.();
    }
  }, [stopTracks, previewUrl]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const discardVideo = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setVideoBlob(null);
    setPreviewUrl(null);
    setState('idle');
    setElapsed(0);
    onDiscard?.();
  }, [previewUrl, onDiscard]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLButtonElement>) => {
    e.currentTarget.blur();
  };

  if (state === 'ready') {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-1.5">
          <Video className="w-4 h-4 text-primary" />
          <span className="text-sm text-foreground">Video ready</span>
          <span className="text-xs text-muted-foreground">
            ({(videoBlob!.size / (1024 * 1024)).toFixed(1)}MB)
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={discardVideo}
          className="h-7 w-7 shrink-0"
          title="Discard video"
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
    );
  }

  if (state === 'recording') {
    return (
      <div className="flex items-center gap-2">
        <Button
          variant="destructive"
          size="icon"
          onClick={stopRecording}
          onTouchEnd={handleTouchEnd}
          className="h-9 w-9 shrink-0 bg-destructive text-destructive-foreground touch-manipulation focus:outline-none focus-visible:outline-none"
        >
          <Square className="w-4 h-4 fill-current" />
        </Button>
        <div className="flex items-center gap-2 text-sm text-destructive shrink-0">
          <Video className="w-3.5 h-3.5" />
          <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
          <span className="tabular-nums">{formatTime(elapsed)}</span>
          <span className="text-xs text-muted-foreground">/ {formatTime(MAX_DURATION)}</span>
        </div>
      </div>
    );
  }

  // idle — starting up, show nothing (auto-start fires)
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Video className="w-4 h-4 animate-pulse" />
      <span>Starting camera…</span>
    </div>
  );
}

export function VideoRecordButton({ onPress, disabled }: { onPress: () => void; disabled?: boolean }) {
  const handleTouchEnd = (e: React.TouchEvent<HTMLButtonElement>) => {
    e.currentTarget.blur();
  };

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={onPress}
      onTouchEnd={handleTouchEnd}
      disabled={disabled}
      className="h-9 flex-1 bg-background touch-manipulation [@media(hover:hover)]:hover:bg-accent focus:outline-none focus-visible:outline-none"
      title="Record video"
    >
      <Video className="w-4 h-4" />
    </Button>
  );
}
