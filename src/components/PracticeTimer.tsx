import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  const [selectedMinutes, setSelectedMinutes] = useState(15);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [showComplete, setShowComplete] = useState(false);
  const [customInputValue, setCustomInputValue] = useState('');
  
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  
  // Play completion sound
  const playCompleteSound = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    
    const ctx = audioContextRef.current;
    
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
    if (isRunning && remainingSeconds > 0) {
      intervalRef.current = setInterval(() => {
        setRemainingSeconds(prev => {
          if (prev <= 1) {
            setIsRunning(false);
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
  }, [isRunning, remainingSeconds, playCompleteSound]);
  
  // Cleanup audio context
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);
  
  const startTimer = () => {
    setRemainingSeconds(selectedMinutes * 60);
    setIsRunning(true);
  };
  
  const stopTimer = () => {
    setIsRunning(false);
    setRemainingSeconds(0);
  };
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const handleCustomInput = (value: string) => {
    // Only allow numbers
    const numericValue = value.replace(/[^0-9]/g, '');
    setCustomInputValue(numericValue);
    
    const mins = parseInt(numericValue, 10);
    if (!isNaN(mins) && mins > 0 && mins <= 180) {
      setSelectedMinutes(mins);
    }
  };
  
  const handlePresetClick = (mins: number) => {
    setSelectedMinutes(mins);
    setCustomInputValue('');
  };
  
  // Calculate progress percentage for visual indicator
  const progressPercent = isRunning 
    ? ((selectedMinutes * 60 - remainingSeconds) / (selectedMinutes * 60)) * 100 
    : 0;
  
  const presets = [5, 10, 15, 20, 30];
  const isCustomValue = !presets.includes(selectedMinutes);
  
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
            {/* Header */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Practice Timer</span>
              {isRunning ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={stopTimer}
                  className="h-7 px-3"
                >
                  Stop
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={startTimer}
                  className="h-7 px-3"
                >
                  Start
                </Button>
              )}
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
                <span className="text-3xl font-bold tabular-nums">{selectedMinutes}</span>
                <span className="text-sm text-muted-foreground ml-1">min</span>
              </div>
            )}
            
            {/* Duration presets + custom input - only show when not running */}
            {!isRunning && (
              <div className="space-y-2">
                <div className="flex gap-1.5 justify-center">
                  {presets.map((mins) => (
                    <Button
                      key={mins}
                      variant={selectedMinutes === mins && !isCustomValue ? "secondary" : "ghost"}
                      size="sm"
                      className="h-6 px-2 text-xs"
                      onClick={() => handlePresetClick(mins)}
                    >
                      {mins}
                    </Button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="Custom"
                    value={customInputValue || (isCustomValue ? selectedMinutes.toString() : '')}
                    onChange={(e) => handleCustomInput(e.target.value)}
                    className="h-7 text-xs text-center"
                  />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">min</span>
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
