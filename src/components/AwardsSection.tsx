import { useState, useMemo, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Award, ChevronDown, Check } from 'lucide-react';
import { TapTooltip } from '@/components/shared/TapTooltip';
import { AwardIcon } from '@/components/shared/AwardIcon';
import { AWARD_CATEGORIES, getAchievedAwards, AwardTier } from '@/lib/awardUtils';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface AwardsSectionProps {
  bestStreak: number;
  totalNotes: number;
  totalHours: number;
  selectedAward: string | null;
  onAwardSelected?: (awardId: string | null) => void;
}

export function AwardsSection({
  bestStreak,
  totalNotes,
  totalHours,
  selectedAward,
  onAwardSelected,
}: AwardsSectionProps) {
  const [open, setOpen] = useState(false);
  const { profile } = useAuth();

  const achieved = useMemo(
    () => getAchievedAwards({ bestStreak, totalNotes, totalHours }),
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
            <h3 className="font-medium">Awards</h3>
            <span className="text-xs text-muted-foreground">
              {achievedCount} earned
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

                    return (
                      <button
                        key={tier.id}
                        type="button"
                        onClick={isAchieved ? () => handleSelectAward(tier) : undefined}
                        className={cn(
                          'relative w-10 h-10 rounded-full border ring-1 inline-flex items-center justify-center transition-all',
                          isAchieved
                            ? `${tier.bgColorClass} ${tier.borderColorClass} ${tier.ringColorClass} cursor-pointer hover:opacity-80`
                            : 'bg-muted/20 border-border/30 ring-transparent cursor-default',
                          isSelected && 'ring-2 ring-primary border-primary'
                        )}
                        title={
                          cat.category === 'streak' ? `${tier.threshold}+ day streak` :
                          cat.category === 'notes' ? `${tier.threshold} notes completed` :
                          `${tier.threshold} hours practiced`
                        }
                      >
                        <div className="flex flex-col items-center justify-center gap-0.5">
                          <AwardIcon tier={tier} achieved={isAchieved} size={18} />
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
