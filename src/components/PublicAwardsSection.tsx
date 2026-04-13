import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Award, ChevronDown } from 'lucide-react';
import { AwardIcon } from '@/components/shared/AwardIcon';
import { AWARD_CATEGORIES, ALL_AWARD_TIERS, getAchievedAwards, AwardCategory } from '@/lib/awardUtils';
import { cn } from '@/lib/utils';
import { TapTooltip } from '@/components/shared/TapTooltip';

interface PublicAwardsSectionProps {
  bestStreak: number;
  totalNotes: number;
  totalHours: number;
  bestMonthDays?: number;
  bestCompletedYearPct?: number;
  weeklyGoalsMetCount?: number;
  selectedAward: string | null;
}

function getAwardDescription(category: AwardCategory, threshold: number): string {
  switch (category) {
    case 'streak': return `Maintain a ${threshold}+ day practice streak`;
    case 'notes': return `Complete ${threshold} practice notes`;
    case 'hours': return `Practice for ${threshold} total hours`;
    case 'consistency':
      if (threshold === 25) return `Practice at least 25 days in a single month`;
      if (threshold === 10) return `Achieve your weekly practice goal 10 times`;
      return `Practice at least 75% of days in a calendar year`;
    case 'legend': return `Earn ${threshold} total awards`;
  }
}

export function PublicAwardsSection({
  bestStreak,
  totalNotes,
  totalHours,
  bestMonthDays = 0,
  bestCompletedYearPct = 0,
  weeklyGoalsMetCount = 0,
  selectedAward,
}: PublicAwardsSectionProps) {
  const [open, setOpen] = useState(false);

  const achieved = useMemo(
    () => getAchievedAwards({ bestStreak, totalNotes, totalHours, bestMonthDays, bestCompletedYearPct, weeklyGoalsMetCount }),
    [bestStreak, totalNotes, totalHours, bestMonthDays, bestCompletedYearPct, weeklyGoalsMetCount]
  );

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
                      <TapTooltip
                        key={tier.id}
                        content={
                          <div className="text-xs space-y-0.5">
                            <p className="font-medium">{getAwardDescription(cat.category, tier.threshold)}</p>
                            {isAchieved && <p className="text-primary">✓ Achieved</p>}
                          </div>
                        }
                      >
                        <div
                          className={cn(
                            'relative w-10 h-10 rounded-full border ring-1 inline-flex items-center justify-center',
                            isAchieved
                              ? `${tier.bgColorClass} ${tier.borderColorClass} ${tier.ringColorClass}`
                              : 'bg-muted/20 border-border/30 ring-transparent',
                            isSelected && 'ring-2 ring-primary border-primary'
                          )}
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
