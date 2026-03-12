import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Video, Square, X } from 'lucide-react';
import { toast } from 'sonner';
import { createPortal } from 'react-dom';

const MAX_DURATION = 30; // seconds

interface VideoRecorderProps {
  onDiscard?: () => void;
  onVideoReady?: (blob: Blob) => void;
}

/**
 * VideoRecorder: opens a fullscreen camera overlay on mount.
 * Shows live preview with stop button + timer overlaid.
 * When stopped, calls onVideoReady(blob) and closes.
 */
export function VideoRecorder({ onDiscard, onVideoReady }: VideoRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
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

  // Lock body scroll when overlay is open
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  const startRecording = useCallback(async () => {
    try {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: isMobile
          ? { facingMode: 'environment', width: { ideal: 1080 }, height: { ideal: 1920 } }
          : { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      streamRef.current = stream;

      // Attach live preview
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.play().catch(() => {});
      }

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

  const cancelRecording = useCallback(() => {
    timerRef.current && clearInterval(timerRef.current);
    autoStopRef.current && clearTimeout(autoStopRef.current);
    if (mediaRecorderRef.current?.state === 'recording') {
      // Remove onstop handler to prevent triggering onVideoReady
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    stopTracks();
    onDiscard?.();
  }, [stopTracks, onDiscard]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLButtonElement>) => {
    e.currentTarget.blur();
  };

  const progressPercent = (elapsed / MAX_DURATION) * 100;

  // Render fullscreen overlay via portal
  const overlay = (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      {/* Camera preview */}
      <video
        ref={videoPreviewRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Top bar: cancel + timer */}
      <div className="relative z-10 flex items-center justify-between px-4 pt-4 safe-area-top">
        <Button
          variant="ghost"
          size="icon"
          onClick={cancelRecording}
          onTouchEnd={handleTouchEnd}
          className="h-10 w-10 rounded-full bg-black/40 text-white hover:bg-black/60 backdrop-blur-sm touch-manipulation"
        >
          <X className="w-5 h-5" />
        </Button>

        {recording && (
          <div className="flex items-center gap-2 bg-black/40 backdrop-blur-sm rounded-full px-3 py-1.5">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-white text-sm font-medium tabular-nums">
              {formatTime(elapsed)}
            </span>
            <span className="text-white/60 text-xs">
              / {formatTime(MAX_DURATION)}
            </span>
          </div>
        )}
      </div>

      {/* Bottom bar: stop button */}
      <div className="relative z-10 mt-auto flex flex-col items-center gap-4 pb-10 safe-area-bottom">
        {/* Progress ring */}
        {recording && (
          <button
            onClick={stopRecording}
            onTouchEnd={handleTouchEnd}
            className="relative w-20 h-20 rounded-full flex items-center justify-center touch-manipulation focus:outline-none"
          >
            {/* Outer ring with progress */}
            <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 80 80">
              <circle
                cx="40" cy="40" r="36"
                fill="none"
                stroke="rgba(255,255,255,0.3)"
                strokeWidth="4"
              />
              <circle
                cx="40" cy="40" r="36"
                fill="none"
                stroke="#ef4444"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 36}`}
                strokeDashoffset={`${2 * Math.PI * 36 * (1 - progressPercent / 100)}`}
                className="transition-[stroke-dashoffset] duration-1000 ease-linear"
              />
            </svg>
            {/* Inner stop square */}
            <div className="w-8 h-8 rounded-md bg-red-500" />
          </button>
        )}

        {!recording && (
          <div className="text-white/60 text-sm">Starting camera…</div>
        )}
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
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
