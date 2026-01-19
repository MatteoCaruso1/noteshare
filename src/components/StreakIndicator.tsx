import { Flame } from 'lucide-react';
import { usePracticeStats } from '@/hooks/usePracticeStats';
import { useAuth } from '@/hooks/useAuth';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export function StreakIndicator() {
  const { profile } = useAuth();
  const { data: stats } = usePracticeStats(profile?.id);

  if (!profile || !stats) {
    return null;
  }

  const streak = stats.currentStreak;
  
  // Determine glow intensity based on milestone thresholds
  const getGlowClass = () => {
    if (streak >= 180) return 'shadow-[0_0_12px_hsl(var(--primary)/0.8)] animate-pulse';
    if (streak >= 90) return 'shadow-[0_0_8px_hsl(var(--primary)/0.6)] animate-pulse';
    if (streak >= 30) return 'shadow-[0_0_6px_hsl(var(--primary)/0.5)] animate-pulse';
    return '';
  };
  
  const isMilestone = streak >= 30;
  const glowClass = getGlowClass();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button 
          className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
            streak === 0
              ? 'bg-muted/30 text-muted-foreground/50'
              : 'bg-primary/10 text-primary'
          } ${glowClass}`}
        >
          <Flame 
            className={`w-3.5 h-3.5 ${streak === 0 ? 'text-muted-foreground/40' : 'text-primary'}`}
            fill={isMilestone ? 'currentColor' : 'none'}
          />
          <span>{streak}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent side="bottom" className="text-xs max-w-[200px] p-3">
        <p>Days practiced in a row. Reach milestones to earn rewards!</p>
      </PopoverContent>
    </Popover>
  );
}
