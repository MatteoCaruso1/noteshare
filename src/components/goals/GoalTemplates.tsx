import { Button } from '@/components/ui/button';
import { Lightbulb } from 'lucide-react';

interface GoalTemplate {
  title: string;
  progressType: 'checkbox' | 'step' | 'time';
  targetSteps?: number;
  targetMinutes?: number;
  goalType: 'near-term' | 'long-term';
}

const GOAL_TEMPLATES: GoalTemplate[] = [
  { title: 'Learn 3 new songs', progressType: 'step', targetSteps: 3, goalType: 'near-term' },
  { title: 'Learn 5 jazz standards', progressType: 'step', targetSteps: 5, goalType: 'near-term' },
  { title: 'Learn major scales in all keys', progressType: 'step', targetSteps: 12, goalType: 'near-term' },
  { title: 'Post a gig video', progressType: 'checkbox', goalType: 'near-term' },
  { title: 'Record a practice clip', progressType: 'checkbox', goalType: 'near-term' },
  { title: 'Practice 4 days per week', progressType: 'step', targetSteps: 4, goalType: 'near-term' },
  { title: 'Write an original tune', progressType: 'checkbox', goalType: 'long-term' },
  { title: 'Play at a jam session', progressType: 'checkbox', goalType: 'long-term' },
  { title: 'Play a paid gig', progressType: 'checkbox', goalType: 'long-term' },
  { title: 'Record an EP', progressType: 'checkbox', goalType: 'long-term' },
  { title: 'Practice 1000 minutes', progressType: 'time', targetMinutes: 1000, goalType: 'long-term' },
];

interface GoalTemplatesProps {
  goalType: 'near-term' | 'long-term';
  onSelect: (template: GoalTemplate) => void;
}

export function GoalTemplates({ goalType, onSelect }: GoalTemplatesProps) {
  const filteredTemplates = GOAL_TEMPLATES.filter(t => t.goalType === goalType);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Lightbulb className="w-3 h-3" />
        <span>Suggestions</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {filteredTemplates.map((template) => (
          <Button
            key={template.title}
            variant="outline"
            size="sm"
            className="text-xs h-7"
            onClick={() => onSelect(template)}
          >
            {template.title}
          </Button>
        ))}
      </div>
    </div>
  );
}

export type { GoalTemplate };
