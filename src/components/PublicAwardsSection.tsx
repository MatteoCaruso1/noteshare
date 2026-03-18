import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Award, ChevronDown } from 'lucide-react';
import { AwardIcon } from '@/components/shared/AwardIcon';
import { AWARD_CATEGORIES, ALL_AWARD_TIERS, getAchievedAwards } from '@/lib/awardUtils';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface PublicAwardsSectionProps {
  bestStreak: number;
  totalNotes: number;
  totalHours: number;
  selectedAward: string | null;
}

export function PublicAwardsSection({
  bestStreak,
  totalNotes,
  totalHours,
  selectedAward,
}: PublicAwardsSectionProps) {
  const [open, setOpen] = useState(false);

  const achieved = useMemo(
    () => getAchievedAwards({ bestStreak, totalNotes, totalHours }),
    [bestStreak, totalNotes, totalHours]
  );

  const achievedCount = achieved.size;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="bg-card border-border overflow-hidden">
        <CollapsibleTrigger className="w-full p-4 flex items-center justify-between text-left">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" />
            <h3 className="font-medium">Awards</h3>
            <span className="text-xs text-muted-foreground">
              {achievedCount} / {ALL_AWARD_TIERS.length}
            </span>
          </div>
          <ChevronDown className={cn(
            'w-4 h-4 text-muted-foreground transition-transform',
            open && 'rotate-180'
          )} />
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-4">
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
                      <div
                        key={tier.id}
                        className={cn(
                          'relative w-10 h-10 rounded-full border ring-1 inline-flex items-center justify-center',
                          isAchieved
                            ? `${tier.bgColorClass} ${tier.borderColorClass} ${tier.ringColorClass}`
                            : 'bg-muted/20 border-border/30 ring-transparent',
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
                      </div>
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
