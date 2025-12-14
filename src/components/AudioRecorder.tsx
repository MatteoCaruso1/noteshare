import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

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

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const getSupportedMimeType = (): string => {
    // Prefer webm/ogg (more reliable in Chrome) and fall back to mp4
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/ogg',
      'audio/wav',
      'audio/mp4',
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
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        }
      });
      
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
        
        const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
        const actualMimeType = mediaRecorder.mimeType || mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: actualMimeType });
        console.log('[AudioRecorder] final blob size:', blob.size, 'type:', blob.type, 'duration(s):', duration);
        
        if (blob.size > 0 && duration > 0) {
          onRecorded(blob, duration);
        } else {
          toast.error('Recording too short or empty. Please try again.');
        }
        
        stream.getTracks().forEach(track => track.stop());
        setProcessing(false);
        setElapsedTime(0);
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        toast.error('Recording failed. Please try again.');
        stream.getTracks().forEach(track => track.stop());
        setRecording(false);
        setProcessing(false);
        setElapsedTime(0);
      };

      mediaRecorder.start();
      setRecording(true);
    } catch (err) {
      console.error('Failed to start recording:', err);
      toast.error('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      setProcessing(true);
      mediaRecorderRef.current.stop();
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
            <div className="w-2 h-2 rounded-full bg-destructive recording-pulse" />
            {formatTime(elapsedTime)}
          </div>
        </>
      ) : (
        <Button
          variant="outline"
          onClick={startRecording}
          disabled={processing}
          className="flex-1"
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