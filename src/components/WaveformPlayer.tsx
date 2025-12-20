import { useEffect, useRef, useState, useCallback, useId } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Button } from '@/components/ui/button';
import { Play, Pause, Mic, Loader2, GripHorizontal } from 'lucide-react';
import { audioManager } from '@/lib/audioManager';

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
  const instanceId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds) || isNaN(seconds)) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    console.log('[WaveformPlayer] Play/Pause clicked, isReady:', isReady, 'isPlaying:', isPlaying);
    
    if (!wavesurferRef.current) {
      console.warn('[WaveformPlayer] No wavesurfer instance');
      return;
    }
    
    if (!isReady) {
      console.warn('[WaveformPlayer] Not ready yet');
      return;
    }
    
    try {
      if (!isPlaying) {
        // Notify audio manager we're about to play
        audioManager.play(
          { 
            pause: () => wavesurferRef.current?.pause(),
            paused: !wavesurferRef.current.isPlaying()
          }, 
          instanceId
        );
      }
      wavesurferRef.current.playPause();
      console.log('[WaveformPlayer] playPause called successfully');
    } catch (err) {
      console.error('[WaveformPlayer] Error during playPause:', err);
    }
  }, [isReady, isPlaying, instanceId]);

  useEffect(() => {
    if (!containerRef.current || !src) return;

    let isMounted = true;
    setIsLoading(true);
    setError(false);
    
    const wavesurfer = WaveSurfer.create({
      container: containerRef.current,
      waveColor: 'rgba(147, 197, 253, 0.5)',
      progressColor: 'hsl(var(--primary))',
      cursorColor: 'hsl(var(--primary))',
      cursorWidth: 2,
      barWidth: 3,
      barGap: 2,
      barRadius: 3,
      height: 48,
      normalize: true,
      // Use MediaElement backend for better mobile/iOS compatibility
      backend: 'MediaElement',
      // Enable touch/drag interaction
      interact: true,
      dragToSeek: true,
    });

    wavesurferRef.current = wavesurfer;

    // Register with audio manager for global pause coordination
    audioManager.registerWavesurfer(instanceId, {
      pause: () => wavesurfer.pause(),
      isPlaying: () => wavesurfer.isPlaying(),
    });

    wavesurfer.on('ready', () => {
      if (isMounted) {
        setDuration(wavesurfer.getDuration());
        setIsReady(true);
        setIsLoading(false);
        setError(false);
      }
    });

    wavesurfer.on('audioprocess', () => {
      if (isMounted) {
        setCurrentTime(wavesurfer.getCurrentTime());
      }
    });

    wavesurfer.on('seeking', () => {
      if (isMounted) {
        setCurrentTime(wavesurfer.getCurrentTime());
      }
    });

    wavesurfer.on('play', () => {
      if (isMounted) {
        setIsPlaying(true);
        // Notify audio manager
        audioManager.play(
          { 
            pause: () => wavesurfer.pause(),
            paused: false
          }, 
          instanceId
        );
      }
    });
    
    wavesurfer.on('pause', () => {
      if (isMounted) {
        setIsPlaying(false);
        audioManager.stop({ pause: () => wavesurfer.pause() });
      }
    });
    
    wavesurfer.on('finish', () => {
      if (isMounted) {
        setIsPlaying(false);
        audioManager.stop({ pause: () => wavesurfer.pause() });
      }
    });

    wavesurfer.on('error', (err) => {
      // Ignore AbortErrors from unmount cleanup
      if (err?.name === 'AbortError' || (err as any)?.message?.includes('abort')) {
        return;
      }
      console.error('[WaveformPlayer] Error loading audio:', err);
      if (isMounted) {
        setError(true);
        setIsLoading(false);
        onError?.();
      }
    });

    // Load with error handling
    try {
      wavesurfer.load(src);
    } catch (e) {
      console.error('[WaveformPlayer] Error initiating load:', e);
      if (isMounted) {
        setError(true);
        setIsLoading(false);
      }
    }

    return () => {
      isMounted = false;
      audioManager.unregisterWavesurfer(instanceId);
      try {
        wavesurfer.destroy();
      } catch (e) {
        // Ignore destroy errors (e.g., AbortError when unmounting during load)
      }
    };
  }, [src, onError, instanceId]);

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
          onPlay={(e) => {
            audioManager.play(e.currentTarget);
          }}
          onPause={(e) => {
            audioManager.stop(e.currentTarget);
          }}
          onEnded={(e) => {
            audioManager.stop(e.currentTarget);
          }}
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
          className="h-9 w-9 flex-shrink-0 text-primary hover:text-primary hover:bg-primary/20"
          onClick={handlePlayPause}
          disabled={!isReady || isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isPlaying ? (
            <Pause className="h-5 w-5" />
          ) : (
            <Play className="h-5 w-5" />
          )}
        </Button>

        <div className="flex-1 min-w-0 relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading audio...</span>
              </div>
            </div>
          )}
          <div 
            ref={containerRef} 
            className={`w-full touch-none ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity`}
            style={{ cursor: isReady ? 'pointer' : 'default' }}
            onClick={(e) => e.stopPropagation()}
          />
          {/* Scrub hint for mobile */}
          {isReady && !isLoading && (
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-1 text-[10px] text-muted-foreground/60 pointer-events-none md:hidden">
              <GripHorizontal className="w-3 h-3" />
              <span>drag to scrub</span>
            </div>
          )}
        </div>

        <div className="text-xs text-muted-foreground flex-shrink-0 min-w-[70px] text-right font-mono">
          {isLoading || !isReady ? (
            <span className="text-muted-foreground/50">--:-- / --:--</span>
          ) : (
            <>{formatTime(currentTime)} / {formatTime(duration)}</>
          )}
        </div>
      </div>
    </div>
  );
}
