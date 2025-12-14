import { useEffect, useRef, useState, useCallback } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Button } from '@/components/ui/button';
import { Play, Pause, Mic, AlertCircle } from 'lucide-react';

interface WaveformPlayerProps {
  src: string;
  title?: string;
  onError?: () => void;
}

// Extract filename from URL for display
function extractFilename(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const filename = pathname.split('/').pop();
    if (!filename) return 'Audio Recording';
    // Remove timestamp prefix if present (e.g., 1765730706098.webm -> audio)
    const decoded = decodeURIComponent(filename);
    // Remove file extension
    const withoutExt = decoded.replace(/\.[^/.]+$/, '');
    // If it's just a timestamp, return default name
    if (/^\d+$/.test(withoutExt)) return 'Audio Recording';
    return withoutExt;
  } catch {
    return 'Audio Recording';
  }
}

export function WaveformPlayer({ src, title, onError }: WaveformPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(false);

  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds) || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (wavesurferRef.current && isReady) {
      wavesurferRef.current.playPause();
    }
  }, [isReady]);

  useEffect(() => {
    if (!containerRef.current || !src) return;

    const wavesurfer = WaveSurfer.create({
      container: containerRef.current,
      waveColor: 'rgba(147, 197, 253, 0.5)',
      progressColor: 'hsl(var(--primary))',
      cursorColor: 'hsl(var(--primary))',
      cursorWidth: 2,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      height: 40,
      normalize: true,
      // Use MediaElement backend for better mobile/iOS compatibility
      backend: 'MediaElement',
    });

    wavesurferRef.current = wavesurfer;

    wavesurfer.on('ready', () => {
      setDuration(wavesurfer.getDuration());
      setIsReady(true);
      setError(false);
    });

    wavesurfer.on('audioprocess', () => {
      setCurrentTime(wavesurfer.getCurrentTime());
    });

    wavesurfer.on('seeking', () => {
      setCurrentTime(wavesurfer.getCurrentTime());
    });

    wavesurfer.on('play', () => setIsPlaying(true));
    wavesurfer.on('pause', () => setIsPlaying(false));
    wavesurfer.on('finish', () => setIsPlaying(false));

    wavesurfer.on('error', (err) => {
      console.error('[WaveformPlayer] Error loading audio:', err);
      setError(true);
      onError?.();
    });

    wavesurfer.load(src);

    return () => {
      wavesurfer.destroy();
    };
  }, [src, onError]);

  // Fallback to native audio if waveform fails
  if (error) {
    return (
      <div className="flex items-center gap-2 p-2 bg-secondary/50 rounded-lg">
        <Mic className="w-4 h-4 text-primary flex-shrink-0" />
        <audio
          src={src}
          controls
          preload="metadata"
          className="flex-1 h-8 min-w-0"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    );
  }

  const displayTitle = title || extractFilename(src);

  return (
    <div 
      className="bg-secondary/50 rounded-lg w-full"
      onClick={(e) => e.stopPropagation()}
    >
      {displayTitle && (
        <div className="px-3 pt-2 pb-0">
          <p className="text-xs text-muted-foreground truncate">
            🎵 {displayTitle}
          </p>
        </div>
      )}
      <div className="flex items-center gap-3 p-3 pt-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 flex-shrink-0 text-primary hover:text-primary hover:bg-primary/20"
          onClick={handlePlayPause}
          disabled={!isReady}
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>

        <div className="flex-1 min-w-0">
          <div 
            ref={containerRef} 
            className="w-full cursor-pointer"
            onClick={(e) => e.stopPropagation()}
          />
        </div>

        <div className="text-xs text-muted-foreground flex-shrink-0 min-w-[70px] text-right font-mono">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      </div>
    </div>
  );
}
