import { useEffect, useRef, useState, useCallback, useId } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Play, Pause, Mic, Loader2, Check } from 'lucide-react';
import { audioManager } from '@/lib/audioManager';
import { useSignedUrl } from '@/hooks/useSignedUrl';

interface WaveformPlayerProps {
  src: string;
  title?: string;
  onRename?: (newName: string) => void;
  onError?: () => void;
  variant?: 'default' | 'sepia';
}

// Extract filename from URL for display - returns empty string for timestamp-only filenames
function extractFilename(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const filename = pathname.split('/').pop();
    if (!filename) return '';
    // Remove timestamp prefix if present (e.g., 1765730706098.webm -> audio)
    const decoded = decodeURIComponent(filename);
    // Remove file extension
    const withoutExt = decoded.replace(/\.[^/.]+$/, '');
    // If it's just a timestamp, return empty string (no name)
    if (/^\d+$/.test(withoutExt)) return '';
    return withoutExt;
  } catch {
    return '';
  }
}

export function WaveformPlayer({ src, title, onRename, onError, variant = 'default' }: WaveformPlayerProps) {
  const instanceId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const playStartTimeoutRef = useRef<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  
  // Get signed URL for private bucket access
  const { signedUrl, loading: urlLoading } = useSignedUrl(src);

  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds) || isNaN(seconds)) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();

    const ws = wavesurferRef.current;
    if (!ws || !isReady) return;

    try {
      if (!ws.isPlaying()) {
        // If playback doesn't actually start, fall back to native audio controls.
        if (playStartTimeoutRef.current) {
          window.clearTimeout(playStartTimeoutRef.current);
        }
        playStartTimeoutRef.current = window.setTimeout(() => {
          const stillNotPlaying = !wavesurferRef.current?.isPlaying();
          if (stillNotPlaying) {
            console.warn('[WaveformPlayer] Playback did not start; falling back to native audio');
            setError(true);
          }
        }, 400);

        audioManager.pauseAll();
      }

      ws.playPause();
    } catch (err) {
      console.error('[WaveformPlayer] Error during playPause:', err);
      setError(true);
    }
  }, [isReady]);

  useEffect(() => {
    if (!containerRef.current || !signedUrl || urlLoading) return;

    let isMounted = true;
    setIsLoading(true);
    setError(false);
    
    // Sepia/amber colors for memory variant
    const isSepia = variant === 'sepia';
    const waveColor = isSepia ? 'rgba(180, 140, 100, 0.5)' : 'rgba(147, 197, 253, 0.5)';
    const progressColor = isSepia ? 'rgb(180, 130, 70)' : 'hsl(var(--primary))';
    const cursorColor = isSepia ? 'rgb(200, 150, 80)' : 'hsl(var(--primary))';

    const wavesurfer = WaveSurfer.create({
      container: containerRef.current,
      waveColor,
      progressColor,
      cursorColor,
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
      if (playStartTimeoutRef.current) {
        window.clearTimeout(playStartTimeoutRef.current);
        playStartTimeoutRef.current = null;
      }

      if (isMounted) {
        setIsPlaying(true);
      }
    });
    
    wavesurfer.on('pause', () => {
      if (isMounted) {
        setIsPlaying(false);
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

    // Load with error handling - use signed URL
    try {
      wavesurfer.load(signedUrl);
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
      if (playStartTimeoutRef.current) {
        window.clearTimeout(playStartTimeoutRef.current);
        playStartTimeoutRef.current = null;
      }
      // Don't destroy wavesurfer if it's currently playing - let audio continue
      // Only clean up if not playing
      if (!wavesurfer.isPlaying()) {
        try {
          wavesurfer.destroy();
        } catch (e) {
          // Ignore destroy errors (e.g., AbortError when unmounting during load)
        }
      }
    };
  }, [signedUrl, urlLoading, onError, instanceId]);

  // Fallback to native audio if waveform fails
  const isSepia = variant === 'sepia';
  
  if (error && signedUrl) {
    return (
      <div className={`flex items-center gap-2 p-3 rounded-lg ${isSepia ? 'bg-amber-900/20 border border-amber-700/30' : 'bg-secondary/50'}`}>
        <Mic className={`w-4 h-4 flex-shrink-0 ${isSepia ? 'text-amber-500' : 'text-primary'}`} />
        <audio
          src={signedUrl}
          controls
          preload="metadata"
          className="flex-1 h-8 min-w-0"
          style={isSepia ? { filter: 'sepia(0.5) saturate(1.2)' } : undefined}
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

  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onRename) return;
    setEditName(displayTitle);
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (onRename) {
      onRename(editName.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
    }
  };

  return (
    <div 
      className="bg-secondary/50 rounded-lg w-full"
      onClick={(e) => e.stopPropagation()}
    >
      {(displayTitle || onRename) && (
        <div className="px-3 pt-2 pb-0">
          {isEditing ? (
            <div className="flex items-center gap-1">
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleSaveEdit}
                className="h-6 text-xs py-0 px-1 flex-1"
                placeholder="Recording name..."
                autoFocus
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 flex-shrink-0"
                onClick={handleSaveEdit}
              >
                <Check className="w-3 h-3" />
              </Button>
            </div>
          ) : displayTitle ? (
            <p 
              className={`text-xs text-muted-foreground truncate ${onRename ? 'cursor-pointer hover:text-foreground transition-colors' : ''}`}
              onClick={onRename ? handleStartEdit : undefined}
            >
              {displayTitle}
            </p>
          ) : onRename ? (
            <p 
              className="text-xs text-muted-foreground/60 italic cursor-pointer hover:text-muted-foreground transition-colors"
              onClick={handleStartEdit}
            >
              Tap to name recording...
            </p>
          ) : null}
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
