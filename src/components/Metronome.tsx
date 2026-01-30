import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

// Metronome icon - simple circle with tick marks
function MetronomeIcon({ className, isPlaying }: { className?: string; isPlaying?: boolean }) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      className={className}
    >
      {/* Metronome body - triangle shape */}
      <path d="M12 3L4 21h16L12 3z" />
      {/* Pendulum arm */}
      <line 
        x1="12" 
        y1="8" 
        x2={isPlaying ? "15" : "12"} 
        y2="18" 
        className={isPlaying ? "animate-pulse" : ""}
      />
      {/* Weight on pendulum */}
      <circle cx={isPlaying ? "14" : "12"} cy="14" r="2" fill="currentColor" />
    </svg>
  );
}

interface MetronomeProps {
  className?: string;
}

export function Metronome({ className }: MetronomeProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(120);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextTickTimeRef = useRef<number>(0);
  const schedulerTimerRef = useRef<number | null>(null);
  
  // Create a click sound using Web Audio API
  const playClick = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    
    const ctx = audioContextRef.current;
    
    // Resume context if suspended (needed for mobile)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    // Short, punchy click sound
    oscillator.frequency.value = 1000;
    oscillator.type = 'sine';
    
    const now = ctx.currentTime;
    gainNode.gain.setValueAtTime(0.3, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    
    oscillator.start(now);
    oscillator.stop(now + 0.05);
  }, []);
  
  // Scheduler for accurate timing
  const scheduler = useCallback(() => {
    if (!audioContextRef.current) return;
    
    const ctx = audioContextRef.current;
    const secondsPerBeat = 60.0 / bpm;
    
    // Schedule clicks ahead of time for accuracy
    while (nextTickTimeRef.current < ctx.currentTime + 0.1) {
      playClick();
      nextTickTimeRef.current += secondsPerBeat;
    }
    
    schedulerTimerRef.current = window.setTimeout(scheduler, 25);
  }, [bpm, playClick]);
  
  // Start/stop metronome
  useEffect(() => {
    if (isPlaying) {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
      nextTickTimeRef.current = audioContextRef.current.currentTime;
      scheduler();
    } else {
      if (schedulerTimerRef.current) {
        clearTimeout(schedulerTimerRef.current);
        schedulerTimerRef.current = null;
      }
    }
    
    return () => {
      if (schedulerTimerRef.current) {
        clearTimeout(schedulerTimerRef.current);
      }
    };
  }, [isPlaying, scheduler]);
  
  // Update scheduler when BPM changes while playing
  useEffect(() => {
    if (isPlaying && schedulerTimerRef.current) {
      clearTimeout(schedulerTimerRef.current);
      scheduler();
    }
  }, [bpm, isPlaying, scheduler]);
  
  // Cleanup audio context on unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);
  
  const toggleMetronome = () => {
    setIsPlaying(!isPlaying);
  };
  
  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-8 w-8 relative",
                isPlaying && "text-primary",
                className
              )}
            >
              <MetronomeIcon className="w-4 h-4" isPlaying={isPlaying} />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Metronome {isPlaying ? `(${bpm} BPM)` : ''}</TooltipContent>
      </Tooltip>
      <PopoverContent className="w-56 p-3 bg-popover" align="start">
        <div className="space-y-4">
          {/* Header with toggle */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Metronome</span>
            <Button
              size="sm"
              variant={isPlaying ? "default" : "outline"}
              onClick={toggleMetronome}
              className="h-7 px-3"
            >
              {isPlaying ? 'Stop' : 'Start'}
            </Button>
          </div>
          
          {/* BPM Display */}
          <div className="text-center">
            <span className="text-3xl font-bold tabular-nums">{bpm}</span>
            <span className="text-sm text-muted-foreground ml-1">BPM</span>
          </div>
          
          {/* BPM Slider */}
          <Slider
            value={[bpm]}
            onValueChange={([value]) => setBpm(value)}
            min={40}
            max={240}
            step={1}
            className="w-full"
          />
          
          {/* Quick tempo buttons - 5 options to fit on one line */}
          <div className="flex gap-1.5 justify-center">
            {[60, 80, 100, 120, 140].map((tempo) => (
              <Button
                key={tempo}
                variant={bpm === tempo ? "secondary" : "ghost"}
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => setBpm(tempo)}
              >
                {tempo}
              </Button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
