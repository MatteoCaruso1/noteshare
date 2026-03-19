import { useState, useMemo, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Award, ChevronDown, Check } from 'lucide-react';
import { AwardIcon } from '@/components/shared/AwardIcon';
import { AWARD_CATEGORIES, ALL_AWARD_TIERS, getAchievedAwards, getBaseAchievedCount, AwardTier, AwardCategory } from '@/lib/awardUtils';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { TapTooltip } from '@/components/shared/TapTooltip';
import { toast } from 'sonner';

function getAwardDescription(category: AwardCategory, threshold: number): string {
  switch (category) {
    case 'streak': return `Maintain a ${threshold}+ day practice streak`;
    case 'notes': return `Complete ${threshold} practice notes`;
    case 'hours': return `Practice for ${threshold} total hours`;
    case 'legend': return `Earn ${threshold} total awards`;
  }
}

function getCurrentProgress(category: AwardCategory, stats: { bestStreak: number; totalNotes: number; totalHours: number; baseAwardCount: number }): string {
  switch (category) {
    case 'streak': return `Currently ${stats.bestStreak} days`;
    case 'notes': return `Currently ${stats.totalNotes} notes`;
    case 'hours': return `Currently ${stats.totalHours}h`;
    case 'legend': return `Currently ${stats.baseAwardCount} awards`;
  }
}

interface AwardsSectionProps {
  bestStreak: number;
  totalNotes: number;
  totalHours: number;
  selectedAward: string | null;
  achievementCounts?: Record<string, number>;
  onAwardSelected?: (awardId: string | null) => void;
}

export function AwardsSection({
  bestStreak,
  totalNotes,
  totalHours,
  selectedAward,
  achievementCounts,
  onAwardSelected,
}: AwardsSectionProps) {
  const [open, setOpen] = useState(false);
  const { profile } = useAuth();

  const achieved = useMemo(
    () => getAchievedAwards({ bestStreak, totalNotes, totalHours }),
    [bestStreak, totalNotes, totalHours]
  );

  const baseAwardCount = useMemo(
    () => getBaseAchievedCount({ bestStreak, totalNotes, totalHours }),
    [bestStreak, totalNotes, totalHours]
  );

  const handleSelectAward = useCallback(async (tier: AwardTier) => {
    if (!profile?.id) return;
    if (!achieved.has(tier.id)) return; // Can't select unachieved

    const newValue = selectedAward === tier.id ? null : tier.id;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ selected_award: newValue } as any)
        .eq('id', profile.id);

      if (error) throw error;
      onAwardSelected?.(newValue);
    } catch {
      toast.error('Failed to update award');
    }
  }, [profile?.id, selectedAward, achieved, onAwardSelected]);

  const achievedCount = achieved.size;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="bg-card border-border overflow-hidden">
        <CollapsibleTrigger className="w-full p-4 flex items-center justify-between text-left">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" />
            <h3 className="font-medium">Achievements</h3>
            <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full leading-none flex items-center">
              {achievedCount}&thinsp;/&thinsp;{ALL_AWARD_TIERS.length}
            </span>
          </div>
          <ChevronDown className={cn(
            'w-4 h-4 text-muted-foreground transition-transform',
            open && 'rotate-180'
          )} />
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-4">
            <p className="text-xs text-muted-foreground">
              Tap an earned award to display it beside your name
            </p>

            {AWARD_CATEGORIES.map((cat) => (
              <div key={cat.category}>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  {cat.title}
                </p>
                <div className="flex flex-wrap gap-2">
                  {cat.tiers.map((tier) => {
                    const isAchieved = achieved.has(tier.id);
                    const isSelected = selectedAward === tier.id;
                    // For streak awards, get the achievement count
                    const streakCount = cat.category === 'streak' && isAchieved
                      ? Math.max(achievementCounts?.[String(tier.threshold)] || 0, 1)
                      : undefined;

                    return (
                      <TapTooltip
                        key={tier.id}
                        content={
                          <div className="text-xs space-y-0.5">
                            <p className="font-medium">{getAwardDescription(cat.category, tier.threshold)}</p>
                            <p className="text-muted-foreground">{getCurrentProgress(cat.category, { bestStreak, totalNotes, totalHours, baseAwardCount })}</p>
                            {isAchieved && <p className="text-primary">✓ Achieved{streakCount ? ` (${streakCount}x)` : ''}</p>}
                          </div>
                        }
                      >
                        <button
                          type="button"
                          onClick={isAchieved ? () => handleSelectAward(tier) : undefined}
                          className={cn(
                            'relative w-10 h-10 rounded-full border ring-1 inline-flex items-center justify-center transition-all',
                            isAchieved
                              ? `${tier.bgColorClass} ${tier.borderColorClass} ${tier.ringColorClass} cursor-pointer hover:opacity-80`
                              : 'bg-muted/20 border-border/30 ring-transparent cursor-default',
                            isSelected && 'ring-2 ring-primary border-primary'
                          )}
                        >
                          <div className="flex flex-col items-center justify-center gap-0.5">
                            <AwardIcon tier={tier} achieved={isAchieved} size={18} count={streakCount} />
                            <span className={cn(
                              'text-[9px] leading-none font-medium',
                              isAchieved ? tier.colorClass : 'text-muted-foreground/40'
                            )}>
                              {tier.label}
                            </span>
                          </div>
                          {isSelected && (
                            <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-primary rounded-full flex items-center justify-center">
                              <Check className="w-2 h-2 text-primary-foreground" />
                            </div>
                          )}
                        </button>
                      </TapTooltip>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
