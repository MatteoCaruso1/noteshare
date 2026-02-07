import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Timer, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePremium } from '@/contexts/PremiumContext';
import { usePracticeTimer } from '@/contexts/PracticeTimerContext';
import { useToast } from '@/hooks/use-toast';

interface PracticeTimerProps {
  className?: string;
}

export function PracticeTimer({ className }: PracticeTimerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { isPremium, isLoading: isPremiumLoading, openPremiumDialog } = usePremium();
  const { toast } = useToast();
  
  // Use context for persistent state
  const {
    isRunning,
    isPaused,
    remainingSeconds,
    inputValue,
    selectedMinutes,
    isValidInput,
    showComplete,
    setInputValue,
    setShowComplete,
    startTimer,
    pauseTimer,
    resumeTimer,
    endTimer,
    formatTime,
    progressPercent,
  } = usePracticeTimer();
  
  const handleMinutesInput = (value: string) => {
    const numericValue = value.replace(/[^0-9]/g, '');
    setInputValue(numericValue);
  };
  
  const handlePresetClick = (mins: number) => {
    setInputValue(mins.toString());
  };
  
  const presets = [5, 10, 15, 20, 30];

  const handleOpenChange = (newOpen: boolean) => {
    // If free user tries to open, show toast and block
    if (newOpen && !isPremiumLoading && !isPremium) {
      toast({
        title: "Pro Feature",
        description: "Practice Timer is available for Pro users.",
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
    <>
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
            isRunning && "text-primary",
            // Grey out for free users to indicate premium feature
            !isPremiumLoading && !isPremium && "text-muted-foreground opacity-50",
            className
          )}
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          <Timer className="w-4 h-4" />
          {isRunning && (
              <svg 
                className="absolute inset-0 w-8 h-8 -rotate-90 pointer-events-none"
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
          </button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-56 p-3 bg-popover" 
          align="start"
          onPointerDownOutside={(e) => {
            // Prevent closing when interacting with content
            const target = e.target as HTMLElement;
            if (target.closest('[data-timer-content]')) {
              e.preventDefault();
            }
          }}
        >
          <div className="space-y-4" data-timer-content>
            {/* Header with controls */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Practice Timer</span>
              <div className="flex gap-1">
                {isRunning ? (
                  <>
                    {isPaused ? (
                      <button
                        type="button"
                        onClick={resumeTimer}
                        className="inline-flex items-center justify-center h-7 px-3 rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground"
                      >
                        Resume
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={pauseTimer}
                        className="inline-flex items-center justify-center h-7 px-3 rounded-md text-sm font-medium transition-colors bg-secondary text-secondary-foreground"
                      >
                        Pause
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={endTimer}
                      className="inline-flex items-center justify-center h-7 px-3 rounded-md text-sm font-medium transition-colors border border-input bg-background"
                    >
                      End
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={isValidInput ? startTimer : undefined}
                    disabled={!isValidInput}
                    className="inline-flex items-center justify-center h-7 px-3 rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground disabled:opacity-50 disabled:pointer-events-none"
                  >
                    Start
                  </button>
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
            
            {/* Duration presets - only show when not running */}
            {!isRunning && (
              <div className="space-y-2">
                <div className="flex gap-1.5 justify-center">
                  {presets.map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => handlePresetClick(mins)}
                      className={cn(
                        "inline-flex items-center justify-center h-6 px-2 rounded-md text-xs font-medium transition-colors",
                        selectedMinutes === mins 
                          ? "bg-secondary text-secondary-foreground" 
                          : "hover:bg-accent hover:text-accent-foreground"
                      )}
                    >
                      {mins}
                    </button>
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
