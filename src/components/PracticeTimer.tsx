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
            onClick={() => setTimeout(openPremiumDialog, 150)}
            onTouchEnd={(e) => { e.currentTarget.blur(); }}
            className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground active:bg-primary/90 transition-colors touch-manipulation [-webkit-tap-highlight-color:transparent]"
          >
            See Pro
          </button>
        ),
      });
      return;
    }
    setIsOpen(newOpen);
  };

  // Blur handler to clear stuck focus/hover on mobile
  const handleInteractionEnd = (e: React.TouchEvent | React.PointerEvent) => {
    (e.currentTarget as HTMLButtonElement).blur();
  };
  
  return (
    <>
      <Popover open={isOpen} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <button
            type="button"
            data-no-hover-reset
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
            onTouchEnd={handleInteractionEnd}
            onPointerUp={handleInteractionEnd}
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
                      <Button
                        type="button"
                        variant="default"
                        size="sm"
                        data-no-hover-reset
                        onClick={resumeTimer}
                        className="h-7 px-3"
                      >
                        Resume
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        data-no-hover-reset
                        onClick={pauseTimer}
                        className="h-7 px-3"
                      >
                        Pause
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      data-no-hover-reset
                      onClick={endTimer}
                      className="h-7 px-3"
                    >
                      End
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    data-no-hover-reset
                    onClick={isValidInput ? startTimer : undefined}
                    disabled={!isValidInput}
                    className="h-7 px-3"
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
            
            {/* Duration presets - only show when not running */}
            {!isRunning && (
              <div className="space-y-2">
                <div className="flex gap-1.5 justify-center">
                  {presets.map((mins) => (
                    <Button
                      key={mins}
                      type="button"
                      variant={selectedMinutes === mins ? "secondary" : "ghost"}
                      size="sm"
                      data-no-hover-reset
                      onClick={() => handlePresetClick(mins)}
                      className="h-6 px-2 text-xs"
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
