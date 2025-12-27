import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { audioManager } from '@/lib/audioManager';

interface AudioRecorderProps {
  onRecorded: (blob: Blob, duration: number) => void;
}

export function AudioRecorder({ onRecorded }: AudioRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

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

  // Handle visibility change (screen lock)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && recording && mediaRecorderRef.current) {
        // When screen is locked/hidden, try to keep recording
        // Most browsers will pause, but we can at least handle it gracefully
        console.log('[AudioRecorder] Screen hidden while recording');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [recording]);

  const getSupportedMimeType = (): string => {
    // Prefer webm/ogg (more reliable in Chrome) and fall back to mp4
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

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      
      streamRef.current = stream;
      
      const mimeType = getSupportedMimeType();
      const options: MediaRecorderOptions = mimeType ? { mimeType } : {};
      
      const mediaRecorder = new MediaRecorder(stream, options);
      console.log('[AudioRecorder] Using mimeType:', mediaRecorder.mimeType || mimeType);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      startTimeRef.current = Date.now();
      setElapsedTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);

      mediaRecorder.ondataavailable = (e) => {
        console.log('[AudioRecorder] dataavailable, size:', e.data?.size);
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        console.log('[AudioRecorder] onstop, chunks:', chunksRef.current.length);
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        
        audioManager.setRecording(false);
        
        const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
        const actualMimeType = mediaRecorder.mimeType || mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: actualMimeType });
        console.log('[AudioRecorder] final blob size:', blob.size, 'type:', blob.type, 'duration(s):', duration);
        
        if (blob.size > 0 && duration > 0) {
          onRecorded(blob, duration);
        } else {
          toast.error('Recording too short or empty. Please try again.');
        }
        
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        setProcessing(false);
        setElapsedTime(0);
      };

      mediaRecorder.onerror = (event) => {
        console.error('[AudioRecorder] MediaRecorder error:', event);
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
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
      };

      // Use timeslice to get data more frequently (helps with screen lock scenarios)
      mediaRecorder.start(1000);
      setRecording(true);
    } catch (err) {
      console.error('[AudioRecorder] Failed to start recording:', err);
      audioManager.setRecording(false);
      toast.error('Could not access microphone. Please check permissions.');
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
    }
  };

  return (
    <div className="flex items-center gap-2">
      {recording ? (
        <>
          <Button
            variant="destructive"
            onClick={stopRecording}
            className="flex-1"
          >
            <Square className="w-4 h-4 mr-2" />
            Stop Recording
          </Button>
          <div className="flex items-center gap-2 text-sm text-destructive min-w-[80px]">
            <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
            {formatTime(elapsedTime)}
          </div>
        </>
      ) : (
        <Button
          variant="outline"
          onClick={startRecording}
          className="flex-1 bg-background hover:bg-background active:bg-background"
        >
          {processing ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Mic className="w-4 h-4 mr-2" />
          )}
          {processing ? 'Processing...' : 'Record Audio'}
        </Button>
      )}
    </div>
  );
}