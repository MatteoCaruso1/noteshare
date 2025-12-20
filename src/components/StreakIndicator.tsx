import { Flame } from 'lucide-react';
import { usePracticeStats } from '@/hooks/usePracticeStats';
import { useAuth } from '@/hooks/useAuth';
import { getStreakTier } from '@/lib/streakUtils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function StreakIndicator() {
  const { profile } = useAuth();
  const { data: stats } = usePracticeStats(profile?.id);

  if (!profile || !stats) {
    return null;
  }

  const streak = stats.currentStreak;
  const tier = getStreakTier(streak);
  
  // Don't show if no streak
  if (streak === 0) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div 
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-colors ${
              tier.tier !== 'none' 
                ? `${tier.bgColorClass} ${tier.colorClass}` 
                : 'bg-muted/50 text-muted-foreground'
            }`}
          >
            <Flame className={`w-3.5 h-3.5 ${tier.tier !== 'none' ? tier.colorClass : 'text-orange-500'}`} />
            <span>{streak}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          <p className="font-medium">{streak} day streak</p>
          {tier.tier !== 'none' && (
            <p className={`${tier.colorClass}`}>{tier.label} tier</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
