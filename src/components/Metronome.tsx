import { useState } from 'react';
import { Slider } from '@/components/ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { usePremium } from '@/contexts/PremiumContext';
import { useMetronome } from '@/contexts/MetronomeContext';
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
  
  // Use context for persistent state
  const { isPlaying, bpm, setBpm, toggleMetronome } = useMetronome();
  
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
