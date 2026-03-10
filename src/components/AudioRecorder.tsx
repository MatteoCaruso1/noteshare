import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Loader2, AlertCircle } from 'lucide-react';
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
  userId?: string;
  className?: string;
}

export function AudioRecorder({ onRecorded, onRecordingChange, userId, className }: AudioRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [recordingSize, setRecordingSize] = useState(0);
  const [videoRecording, setVideoRecording] = useState(false);
  const videoRecorderRef = useRef<{ start: () => void } | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const dataIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunkCountRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (dataIntervalRef.current) {
        clearInterval(dataIntervalRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Handle visibility change (screen lock)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && recording && mediaRecorderRef.current) {
        // When screen is locked/hidden, try to keep recording
        // Most browsers will pause, but we can at least handle it gracefully
        console.log('[AudioRecorder] Screen hidden while recording, chunks so far:', chunkCountRef.current);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [recording]);

  const isSafari = (): boolean => {
    const ua = navigator.userAgent;
    return /^((?!chrome|android).)*safari/i.test(ua) || 
           (/iPad|iPhone|iPod/.test(ua) && !('MSStream' in window));
  };

  const getSupportedMimeType = (): string => {
    // Safari/iOS requires mp4 - check this first for iOS devices
    if (isSafari()) {
      // On Safari/iOS, try mp4 first, then let browser decide
      const safariTypes = ['audio/mp4', 'audio/aac', 'audio/mpeg'];
      for (const type of safariTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          return type;
        }
      }
      // Safari may work without specifying mimeType - let it choose
      return '';
    }
    
    // For other browsers, prefer webm/ogg
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/ogg',
      'audio/mp4',
      'audio/mpeg',
    ];
    
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
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
      // Pause any playing audio before recording
      audioManager.pauseAll();
      audioManager.setRecording(true);

      // Safari/iOS is stricter about constraints - use simpler config for Safari
      const audioConstraints = isSafari() 
        ? { audio: true }
        : { 
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            }
          };

      const stream = await navigator.mediaDevices.getUserMedia(audioConstraints);
      
      streamRef.current = stream;
      
      const mimeType = getSupportedMimeType();
      // For Safari, don't pass mimeType if empty - let browser choose
      const options: MediaRecorderOptions = mimeType ? { mimeType } : {};
      
      let mediaRecorder: MediaRecorder;
      try {
        mediaRecorder = new MediaRecorder(stream, options);
      } catch (e) {
        // If options fail (Safari can be picky), try without options
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

      // Start timer
      timerRef.current = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
          chunkCountRef.current++;
          
          // Calculate total size
          const totalSize = chunksRef.current.reduce((acc, chunk) => acc + chunk.size, 0);
          setRecordingSize(totalSize);
          
          console.log(`[AudioRecorder] Chunk #${chunkCountRef.current}, size: ${e.data.size}, total: ${formatBytes(totalSize)}`);
        } else {
          console.warn('[AudioRecorder] Empty chunk received');
        }
      };

      mediaRecorder.onstop = async () => {
        console.log(`[AudioRecorder] onstop - chunks: ${chunksRef.current.length}, total size: ${formatBytes(chunksRef.current.reduce((acc, chunk) => acc + chunk.size, 0))}`);
        
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        if (dataIntervalRef.current) {
          clearInterval(dataIntervalRef.current);
          dataIntervalRef.current = null;
        }
        
        audioManager.setRecording(false);
        
        const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
        const actualMimeType = mediaRecorder.mimeType || 'audio/mp4';
        const blob = new Blob(chunksRef.current, { type: actualMimeType });
        
        console.log(`[AudioRecorder] Final blob - size: ${formatBytes(blob.size)}, type: ${blob.type}, duration: ${duration}s`);
        
        if (blob.size === 0) {
          toast.error('Recording is empty. Please try again.');
          setProcessing(false);
          setElapsedTime(0);
          setRecordingSize(0);
          return;
        }
        
        if (duration === 0) {
          toast.error('Recording too short. Please try again.');
          setProcessing(false);
          setElapsedTime(0);
          setRecordingSize(0);
          return;
        }

        // Show processing toast
        toast.info(`Processing ${formatBytes(blob.size)} recording...`);

        // Save to IndexedDB backup BEFORE calling onRecorded
        let backupId: string | undefined;
        if (isIndexedDBAvailable() && userId) {
          try {
            backupId = generateBackupId();
            await saveRecordingBackup(backupId, blob, duration, userId);
            console.log(`[AudioRecorder] Saved backup ${backupId}`);
          } catch (error) {
            console.error('[AudioRecorder] Failed to save backup:', error);
            // Continue anyway - backup is a safety net, not required
          }
        }

        // Pass to parent with backup ID
        onRecorded(blob, duration, backupId);
        
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        setProcessing(false);
        setElapsedTime(0);
        setRecordingSize(0);
      };

      mediaRecorder.onerror = (event) => {
        console.error('[AudioRecorder] MediaRecorder error:', event);
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        if (dataIntervalRef.current) {
          clearInterval(dataIntervalRef.current);
          dataIntervalRef.current = null;
        }
        audioManager.setRecording(false);
        toast.error('Recording failed. Please try again.');
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        setRecording(false);
        setProcessing(false);
        setElapsedTime(0);
        setRecordingSize(0);
      };

      // Safari has issues with timeslice - use requestData() periodically instead
      if (isSafari()) {
        mediaRecorder.start();
        // For Safari, periodically request data to avoid losing long recordings
        // requestData() forces ondataavailable to fire with current data
        dataIntervalRef.current = setInterval(() => {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            try {
              mediaRecorderRef.current.requestData();
            } catch (e) {
              console.warn('[AudioRecorder] requestData failed:', e);
            }
          }
        }, 5000); // Request data every 5 seconds
      } else {
        // Use timeslice to get data more frequently (helps with screen lock scenarios)
        mediaRecorder.start(1000);
      }
      setRecording(true);
      onRecordingChange?.(true);
    } catch (err) {
      console.error('[AudioRecorder] Failed to start recording:', err);
      audioManager.setRecording(false);
      
      // Provide more specific error message for permission issues
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          toast.error('Microphone access denied. Please enable in Settings > Safari > Microphone.');
        } else if (err.name === 'NotFoundError') {
          toast.error('No microphone found on this device.');
        } else {
          toast.error('Could not access microphone. Please check permissions and try again.');
        }
      } else {
        toast.error('Could not access microphone. Please check permissions.');
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      setProcessing(true);
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.error('[AudioRecorder] Error stopping recorder:', e);
        setProcessing(false);
      }
      setRecording(false);
      onRecordingChange?.(false);
    }
  };

  // Handle touch end to blur button and prevent stuck focus states
  const handleTouchEnd = (e: React.TouchEvent<HTMLButtonElement>) => {
    e.currentTarget.blur();
  };

  // Format recording size for display
  const getSizeDisplay = (): string | null => {
    if (!recording || recordingSize === 0) return null;
    const sizeStr = formatBytes(recordingSize);
    if (recordingSize > 50 * 1024 * 1024) {
      return `${sizeStr} - Large`;
    }
    return sizeStr;
  };

  const sizeDisplay = getSizeDisplay();

  return (
    <div className={`flex flex-col gap-2 ${className || ''}`}>
      {videoRecording ? (
        <VideoRecorder />
      ) : null}
      <div className="flex items-center gap-2">
        {recording ? (
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
          <>
            <Button
              variant="outline"
              size="icon"
              onClick={startRecording}
              onTouchEnd={handleTouchEnd}
              disabled={videoRecording}
              className="h-9 flex-1 bg-background touch-manipulation [@media(hover:hover)]:hover:bg-accent focus:outline-none focus-visible:outline-none"
              title="Record audio"
            >
              {processing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </Button>
            <VideoRecordButton
              onPress={() => setVideoRecording(true)}
              disabled={recording || processing}
            />
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Clear a recording backup after successful upload
 * This should be called by the parent component after upload succeeds
 */
export async function clearRecordingBackup(backupId: string): Promise<void> {
  try {
    await clearBackup(backupId);
    console.log(`[AudioRecorder] Cleared backup ${backupId} after successful upload`);
  } catch (error) {
    console.error('[AudioRecorder] Failed to clear backup:', error);
  }
}