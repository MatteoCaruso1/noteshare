import { useState, useRef, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Loader2, Video, X, Play } from 'lucide-react';
import { toast } from 'sonner';
import { audioManager } from '@/lib/audioManager';
import { 
  saveRecordingBackup, 
  clearBackup, 
  generateBackupId,
  formatBytes,
  isIndexedDBAvailable 
} from '@/lib/recordingBackup';
import { VideoRecorder, VideoRecordButton } from '@/components/VideoRecorder';

interface AudioRecorderProps {
  onRecorded: (blob: Blob, duration: number, backupId?: string) => void;
  onRecordingChange?: (isRecording: boolean) => void;
  onVideoReady?: (blob: Blob) => void;
  onVideoDiscarded?: () => void;
  userId?: string;
  className?: string;
}

export function AudioRecorder({ onRecorded, onRecordingChange, onVideoReady, onVideoDiscarded, userId, className }: AudioRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [recordingSize, setRecordingSize] = useState(0);
  const [videoRecording, setVideoRecording] = useState(false);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const dataIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunkCountRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (dataIntervalRef.current) clearInterval(dataIntervalRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
    };
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && recording && mediaRecorderRef.current) {
        console.log('[AudioRecorder] Screen hidden while recording, chunks so far:', chunkCountRef.current);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [recording]);

  const isSafari = (): boolean => {
    const ua = navigator.userAgent;
    return /^((?!chrome|android).)*safari/i.test(ua) || 
           (/iPad|iPhone|iPod/.test(ua) && !('MSStream' in window));
  };

  const getSupportedMimeType = (): string => {
    if (isSafari()) {
      const safariTypes = ['audio/mp4', 'audio/aac', 'audio/mpeg'];
      for (const type of safariTypes) {
        if (MediaRecorder.isTypeSupported(type)) return type;
      }
      return '';
    }
    const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/ogg', 'audio/mp4', 'audio/mpeg'];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) return type;
    }
    return '';
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    try {
      audioManager.pauseAll();
      audioManager.setRecording(true);

      const audioConstraints = isSafari() 
        ? { audio: true }
        : { audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } };

      const stream = await navigator.mediaDevices.getUserMedia(audioConstraints);
      streamRef.current = stream;
      
      const mimeType = getSupportedMimeType();
      const options: MediaRecorderOptions = mimeType ? { mimeType } : {};
      
      let mediaRecorder: MediaRecorder;
      try {
        mediaRecorder = new MediaRecorder(stream, options);
      } catch (e) {
        console.warn('[AudioRecorder] MediaRecorder with options failed, trying without:', e);
        mediaRecorder = new MediaRecorder(stream);
      }
      
      console.log('[AudioRecorder] Using mimeType:', mediaRecorder.mimeType || 'default');
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      chunkCountRef.current = 0;
      setRecordingSize(0);
      startTimeRef.current = Date.now();
      setElapsedTime(0);

      timerRef.current = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
          chunkCountRef.current++;
          const totalSize = chunksRef.current.reduce((acc, chunk) => acc + chunk.size, 0);
          setRecordingSize(totalSize);
          console.log(`[AudioRecorder] Chunk #${chunkCountRef.current}, size: ${e.data.size}, total: ${formatBytes(totalSize)}`);
        }
      };

      mediaRecorder.onstop = async () => {
        console.log(`[AudioRecorder] onstop - chunks: ${chunksRef.current.length}`);
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
        if (dataIntervalRef.current) { clearInterval(dataIntervalRef.current); dataIntervalRef.current = null; }
        audioManager.setRecording(false);
        
        const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
        const actualMimeType = mediaRecorder.mimeType || 'audio/mp4';
        const blob = new Blob(chunksRef.current, { type: actualMimeType });
        
        if (blob.size === 0) { toast.error('Recording is empty.'); setProcessing(false); setElapsedTime(0); setRecordingSize(0); return; }
        if (duration === 0) { toast.error('Recording too short.'); setProcessing(false); setElapsedTime(0); setRecordingSize(0); return; }

        toast.info(`Processing ${formatBytes(blob.size)} recording...`);

        let backupId: string | undefined;
        if (isIndexedDBAvailable() && userId) {
          try {
            backupId = generateBackupId();
            await saveRecordingBackup(backupId, blob, duration, userId);
          } catch (error) {
            console.error('[AudioRecorder] Failed to save backup:', error);
          }
        }

        onRecorded(blob, duration, backupId);
        if (streamRef.current) { streamRef.current.getTracks().forEach(track => track.stop()); streamRef.current = null; }
        setProcessing(false);
        setElapsedTime(0);
        setRecordingSize(0);
      };

      mediaRecorder.onerror = (event) => {
        console.error('[AudioRecorder] MediaRecorder error:', event);
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
        if (dataIntervalRef.current) { clearInterval(dataIntervalRef.current); dataIntervalRef.current = null; }
        audioManager.setRecording(false);
        toast.error('Recording failed.');
        if (streamRef.current) { streamRef.current.getTracks().forEach(track => track.stop()); streamRef.current = null; }
        setRecording(false);
        setProcessing(false);
        setElapsedTime(0);
        setRecordingSize(0);
      };

      if (isSafari()) {
        mediaRecorder.start();
        dataIntervalRef.current = setInterval(() => {
          if (mediaRecorderRef.current?.state === 'recording') {
            try { mediaRecorderRef.current.requestData(); } catch (e) { console.warn('[AudioRecorder] requestData failed:', e); }
          }
        }, 5000);
      } else {
        mediaRecorder.start(1000);
      }
      setRecording(true);
      onRecordingChange?.(true);
    } catch (err) {
      console.error('[AudioRecorder] Failed to start recording:', err);
      audioManager.setRecording(false);
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          toast.error('Microphone access denied. Please enable in Settings.');
        } else if (err.name === 'NotFoundError') {
          toast.error('No microphone found.');
        } else {
          toast.error('Could not access microphone.');
        }
      } else {
        toast.error('Could not access microphone.');
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      setProcessing(true);
      try { mediaRecorderRef.current.stop(); } catch (e) { console.error('[AudioRecorder] Error stopping:', e); setProcessing(false); }
      setRecording(false);
      onRecordingChange?.(false);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLButtonElement>) => {
    e.currentTarget.blur();
  };

  const handleVideoReady = (blob: Blob) => {
    setVideoBlob(blob);
    setVideoRecording(false);
    onVideoReady?.(blob);
  };

  const handleVideoDiscard = () => {
    setVideoRecording(false);
  };

  const discardVideo = () => {
    setVideoBlob(null);
    onVideoDiscarded?.();
  };

  const getSizeDisplay = (): string | null => {
    if (!recording || recordingSize === 0) return null;
    if (recordingSize > 50 * 1024 * 1024) return `${formatBytes(recordingSize)} - Large`;
    return formatBytes(recordingSize);
  };

  const sizeDisplay = getSizeDisplay();
  const isAnyRecording = recording || videoRecording;

  return (
    <div className={`flex flex-col gap-2 ${className || ''}`}>
      {/* Video recorder overlay (renders via portal) */}
      {videoRecording && (
        <VideoRecorder
          onDiscard={handleVideoDiscard}
          onVideoReady={handleVideoReady}
        />
      )}

      <div className="flex items-center gap-2">
        {recording ? (
          // Audio recording: stop + timer
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
              <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
              <span className="tabular-nums">{formatTime(elapsedTime)}</span>
              {sizeDisplay && recordingSize > 50 * 1024 * 1024 && (
                <span className="text-xs text-muted-foreground">({sizeDisplay})</span>
              )}
            </div>
          </>
        ) : (
          // Idle: mic + video buttons
          <>
            <Button
              variant="outline"
              size="icon"
              onClick={startRecording}
              onTouchEnd={handleTouchEnd}
              className="h-9 flex-1 bg-background touch-manipulation [@media(hover:hover)]:hover:bg-accent focus:outline-none focus-visible:outline-none"
              title="Record audio"
            >
              {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
            </Button>
            <VideoRecordButton
              onPress={() => setVideoRecording(true)}
              disabled={recording || processing}
            />
          </>
        )}
      </div>

      {/* Video ready chip — shown below like audio files */}
      {videoBlob && !videoRecording && (
        <VideoClipChip videoBlob={videoBlob} onDiscard={discardVideo} />
      )}
    </div>
  );
}
/** Small chip showing recorded video with play preview */
function VideoClipChip({ videoBlob, onDiscard }: { videoBlob: Blob; onDiscard: () => void }) {
  const [showPreview, setShowPreview] = useState(false);
  const previewUrl = useMemo(() => URL.createObjectURL(videoBlob), [videoBlob]);

  useEffect(() => {
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowPreview(true)}
          className="flex items-center gap-2 rounded-md border border-border bg-muted/50 px-2.5 py-1.5 hover:bg-muted transition-colors cursor-pointer"
        >
          <Video className="w-3.5 h-3.5 text-primary" />
          <span className="text-sm text-foreground">Video clip</span>
          <span className="text-xs text-muted-foreground">
            ({(videoBlob.size / (1024 * 1024)).toFixed(1)}MB)
          </span>
          <Play className="w-3 h-3 text-muted-foreground" />
        </button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDiscard}
          className="h-7 w-7 shrink-0"
          title="Discard video"
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Fullscreen video preview dialog */}
      {showPreview && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center"
          onClick={() => setShowPreview(false)}
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowPreview(false)}
            className="absolute top-4 right-4 z-10 h-10 w-10 rounded-full bg-black/40 text-white hover:bg-black/60"
          >
            <X className="w-5 h-5" />
          </Button>
          <video
            src={previewUrl}
            autoPlay
            controls
            playsInline
            className="w-full h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}

export async function clearRecordingBackup(backupId: string): Promise<void> {
  try {
    await clearBackup(backupId);
    console.log(`[AudioRecorder] Cleared backup ${backupId} after successful upload`);
  } catch (error) {
    console.error('[AudioRecorder] Failed to clear backup:', error);
  }
}
