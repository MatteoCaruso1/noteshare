import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Video, Square } from 'lucide-react';
import { toast } from 'sonner';

const MAX_DURATION = 30; // seconds

interface VideoRecorderProps {
  onDiscard?: () => void;
  onVideoReady?: (blob: Blob) => void;
}

/**
 * VideoRecorder: auto-starts camera on mount, shows stop + timer inline.
 * When stopped, calls onVideoReady(blob). No "ready" UI — parent handles that.
 */
export function VideoRecorder({ onDiscard, onVideoReady }: VideoRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);

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
          onDiscard?.();
          return;
        }

        console.log(`[VideoRecorder] Recorded ${(blob.size / 1024).toFixed(0)}KB, type: ${blob.type}`);
        onVideoReady?.(blob);
      };

      recorder.onerror = (event) => {
        console.error('[VideoRecorder] error:', event);
        stopTracks();
        toast.error('Video recording error.');
        onDiscard?.();
      };

      recorder.start(1000);
      setElapsed(0);
      setRecording(true);

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
  }, [stopTracks, onDiscard, onVideoReady]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLButtonElement>) => {
    e.currentTarget.blur();
  };

  if (!recording) {
    // Still starting up — render nothing (auto-start fires immediately)
    return null;
  }

  // Recording state: stop button + timer, same layout as audio recording
  return (
    <>
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
    </>
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
