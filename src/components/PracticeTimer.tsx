import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Timer, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PracticeTimerProps {
  className?: string;
}

export function PracticeTimer({ className }: PracticeTimerProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [inputValue, setInputValue] = useState('15');
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  
  // Parse input to get valid minutes (0 if invalid/empty)
  const selectedMinutes = parseInt(inputValue, 10) || 0;
  const isValidInput = inputValue.trim() !== '' && selectedMinutes > 0 && selectedMinutes <= 180;
  const [showComplete, setShowComplete] = useState(false);
  
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  
  // Play completion sound - AudioContext is already unlocked from startTimer
  const playCompleteSound = useCallback(() => {
    const ctx = audioContextRef.current;
    if (!ctx) return;
    
    // Resume just in case (shouldn't be needed, but safe)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    
    // Play a pleasant completion chime (two tones)
    const playTone = (freq: number, startTime: number) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.frequency.value = freq;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.2, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.5);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + 0.5);
    };
    
    const now = ctx.currentTime;
    playTone(523, now);       // C5
    playTone(659, now + 0.15); // E5
    playTone(784, now + 0.3);  // G5
  }, []);
  
  // Timer countdown
  useEffect(() => {
    if (isRunning && !isPaused && remainingSeconds > 0) {
      intervalRef.current = setInterval(() => {
        setRemainingSeconds(prev => {
          if (prev <= 1) {
            setIsRunning(false);
            setIsPaused(false);
            setShowComplete(true);
            playCompleteSound();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, isPaused, remainingSeconds, playCompleteSound]);
  
  // Cleanup audio context
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);
  
  const startTimer = async () => {
    // Create and unlock AudioContext on user gesture (required for mobile)
    // This ensures the completion chime will play later
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
    
    setRemainingSeconds(selectedMinutes * 60);
    setIsRunning(true);
    setIsPaused(false);
  };
  
  const endTimer = () => {
    setIsRunning(false);
    setIsPaused(false);
    setRemainingSeconds(0);
  };
  
  const pauseTimer = () => {
    setIsPaused(true);
  };
  
  const resumeTimer = () => {
    setIsPaused(false);
  };
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const handleMinutesInput = (value: string) => {
    const numericValue = value.replace(/[^0-9]/g, '');
    setInputValue(numericValue);
  };
  
  const handlePresetClick = (mins: number) => {
    setInputValue(mins.toString());
  };
  
  // Calculate progress percentage for visual indicator
  const progressPercent = isRunning 
    ? ((selectedMinutes * 60 - remainingSeconds) / (selectedMinutes * 60)) * 100 
    : 0;
  
  const presets = [5, 10, 15, 20, 30];
  
  return (
    <>
      <Popover>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-8 w-8 relative",
                  isRunning && "text-primary",
                  className
                )}
              >
                <Timer className="w-4 h-4" />
                {isRunning && (
                  <svg 
                    className="absolute inset-0 w-8 h-8 -rotate-90"
                    viewBox="0 0 32 32"
                  >
                    <circle
                      cx="16"
                      cy="16"
                      r="14"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeDasharray={`${progressPercent * 0.88} 88`}
                      className="text-primary opacity-30"
                    />
                  </svg>
                )}
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>
            {isRunning ? `Timer: ${formatTime(remainingSeconds)}` : 'Practice Timer'}
          </TooltipContent>
        </Tooltip>
        <PopoverContent className="w-56 p-3 bg-popover" align="start">
          <div className="space-y-4">
            {/* Header with controls */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Practice Timer</span>
              <div className="flex gap-1">
                {isRunning ? (
                  <>
                    {isPaused ? (
                      <Button
                        size="sm"
                        onClick={resumeTimer}
                        className="h-7 px-3"
                      >
                        Resume
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={pauseTimer}
                        className="h-7 px-3"
                      >
                        Pause
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={endTimer}
                      className="h-7 px-3"
                    >
                      End
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    onClick={startTimer}
                    className="h-7 px-3"
                    disabled={!isValidInput}
                  >
                    Start
                  </Button>
                )}
              </div>
            </div>
            
            {/* Time Display */}
            {isRunning ? (
              <div className="text-center">
                <span className="text-3xl font-bold tabular-nums">
                  {formatTime(remainingSeconds)}
                </span>
                <p className="text-xs text-muted-foreground mt-1">remaining</p>
              </div>
            ) : (
              <div className="text-center">
                <div className="flex items-baseline justify-center gap-1">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={inputValue}
                    onChange={(e) => handleMinutesInput(e.target.value)}
                    className="w-16 text-3xl font-bold tabular-nums bg-transparent text-center border-b border-transparent hover:border-border focus:border-primary focus:outline-none"
                  />
                  <span className="text-sm text-muted-foreground">min</span>
                </div>
              </div>
            )}
            
            {/* Duration presets + custom input - only show when not running */}
            {!isRunning && (
              <div className="space-y-2">
                <div className="flex gap-1.5 justify-center">
                  {presets.map((mins) => (
                    <Button
                      key={mins}
                      variant={selectedMinutes === mins ? "secondary" : "ghost"}
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => handlePresetClick(mins)}
                    >
                      {mins}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
      
      {/* Completion Dialog */}
      <Dialog open={showComplete} onOpenChange={setShowComplete}>
        <DialogContent className="max-w-xs text-center p-6">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Check className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Time's Up!</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedMinutes} minute practice complete
              </p>
            </div>
            <Button onClick={() => setShowComplete(false)} className="w-full">
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
