import { useState, useEffect, useRef, useCallback } from 'react';
import { Slider } from '@/components/ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { usePremium } from '@/contexts/PremiumContext';
import { useToast } from '@/hooks/use-toast';

// Metronome icon - simple circle with tick marks
export function MetronomeIcon({ className, isPlaying }: { className?: string; isPlaying?: boolean }) {
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
  const [isOpen, setIsOpen] = useState(false);
  const { isPremium, isLoading: isPremiumLoading, openPremiumDialog } = usePremium();
  const { toast } = useToast();
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(120);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextTickTimeRef = useRef<number>(0);
  const schedulerTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Schedule a click at an exact time using Web Audio API's precise timing
  const scheduleClick = useCallback((time: number) => {
    const ctx = audioContextRef.current;
    if (!ctx) return;
    
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    // Short, punchy click sound at 1000Hz
    oscillator.frequency.value = 1000;
    oscillator.type = 'sine';
    
    // Schedule gain envelope at the EXACT scheduled time (not "now")
    gainNode.gain.setValueAtTime(0.3, time);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
    
    // Start and stop at precise times
    oscillator.start(time);
    oscillator.stop(time + 0.05);
  }, []);
  
  // Lookahead scheduler - schedules clicks ahead of time for sample-accurate timing
  const runScheduler = useCallback(() => {
    const ctx = audioContextRef.current;
    if (!ctx) return;
    
    const secondsPerBeat = 60.0 / bpm;
    const lookahead = 0.1; // Schedule 100ms ahead
    
    // Schedule all clicks that fall within our lookahead window
    while (nextTickTimeRef.current < ctx.currentTime + lookahead) {
      // Only schedule if the time is in the future (or very close to now)
      if (nextTickTimeRef.current >= ctx.currentTime - 0.01) {
        scheduleClick(nextTickTimeRef.current);
      }
      nextTickTimeRef.current += secondsPerBeat;
    }
  }, [bpm, scheduleClick]);
  
  // Start/stop metronome
  useEffect(() => {
    if (isPlaying) {
      // AudioContext is already created and resumed in toggleMetronome (user gesture)
      const ctx = audioContextRef.current;
      if (!ctx) return;
      
      // Start scheduling from now
      nextTickTimeRef.current = ctx.currentTime;
      
      // Run scheduler immediately, then every 25ms
      runScheduler();
      schedulerTimerRef.current = setInterval(runScheduler, 25);
    } else {
      // Stop the scheduler
      if (schedulerTimerRef.current) {
        clearInterval(schedulerTimerRef.current);
        schedulerTimerRef.current = null;
      }
    }
    
    return () => {
      if (schedulerTimerRef.current) {
        clearInterval(schedulerTimerRef.current);
        schedulerTimerRef.current = null;
      }
    };
  }, [isPlaying, runScheduler]);
  
  // Cleanup audio context on unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);
  
  const toggleMetronome = async () => {
    if (!isPlaying) {
      // Create AudioContext on user gesture (required for mobile)
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
      
      const ctx = audioContextRef.current;
      
      // Resume if suspended - MUST happen in click handler for mobile
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      
      // Play a silent buffer to fully unlock audio on iOS
      const buffer = ctx.createBuffer(1, 1, 22050);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
    }
    
    setIsPlaying(!isPlaying);
  };
  
  const handleTempoClick = (tempo: number) => {
    setBpm(tempo);
  };

  const handleOpenChange = (newOpen: boolean) => {
    // If free user tries to open, show toast and block
    if (newOpen && !isPremiumLoading && !isPremium) {
      toast({
        title: "Pro Feature",
        description: "Metronome is available for Pro users.",
        action: (
          <button
            onClick={openPremiumDialog}
            className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            See Pro
          </button>
        ),
      });
      return;
    }
    setIsOpen(newOpen);
  };
  
  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center justify-center h-8 w-8 rounded-md relative",
            "hover:bg-accent hover:text-accent-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            "touch-manipulation select-none",
            "active:bg-accent/80",
            isPlaying && "text-primary",
            // Grey out for free users to indicate premium feature
            !isPremiumLoading && !isPremium && "text-muted-foreground opacity-50",
            className
          )}
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          <MetronomeIcon className="w-4 h-4" isPlaying={isPlaying} />
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-56 p-3 bg-popover" 
        align="start"
        onPointerDownOutside={(e) => {
          // Prevent closing when interacting with content
          const target = e.target as HTMLElement;
          if (target.closest('[data-metronome-content]')) {
            e.preventDefault();
          }
        }}
      >
        <div className="space-y-4" data-metronome-content>
          {/* Header with toggle */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Metronome</span>
            <button
              type="button"
              onClick={toggleMetronome}
              className={cn(
                "inline-flex items-center justify-center h-7 px-3 rounded-md text-sm font-medium transition-colors",
                isPlaying 
                  ? "bg-primary text-primary-foreground" 
                  : "border border-input bg-background hover:bg-accent"
              )}
            >
              {isPlaying ? 'Stop' : 'Start'}
            </button>
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
              <button
                key={tempo}
                type="button"
                onClick={() => handleTempoClick(tempo)}
                className={cn(
                  "inline-flex items-center justify-center h-6 px-2 rounded-md text-xs font-medium transition-colors",
                  bpm === tempo 
                    ? "bg-secondary text-secondary-foreground" 
                    : "hover:bg-accent hover:text-accent-foreground"
                )}
              >
                {tempo}
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}