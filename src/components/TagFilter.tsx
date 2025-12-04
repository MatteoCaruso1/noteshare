import { Badge } from '@/components/ui/badge';
import { STYLE_TAGS, INSTRUMENT_TAGS, CONTENT_TAGS } from '@/types';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

interface TagFilterProps {
  selectedTags: string[];
  onTagToggle: (tag: string) => void;
  onClearAll: () => void;
}

export function TagFilter({ selectedTags, onTagToggle, onClearAll }: TagFilterProps) {
  const allTags = [...STYLE_TAGS.slice(0, 5), ...INSTRUMENT_TAGS.slice(0, 4), ...CONTENT_TAGS.slice(0, 3)];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">Filter by tags</span>
        {selectedTags.length > 0 && (
          <button
            onClick={onClearAll}
            className="flex items-center gap-1 text-xs text-jazz-gold hover:text-jazz-amber transition-colors"
          >
            <X className="h-3 w-3" />
            Clear all
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {allTags.map((tag) => {
          const isSelected = selectedTags.includes(tag);
          return (
            <Badge
              key={tag}
              variant={isSelected ? 'jazz-solid' : 'jazz'}
              className={cn(
                'cursor-pointer transition-all duration-200',
                isSelected && 'shadow-md'
              )}
              onClick={() => onTagToggle(tag)}
            >
              {tag}
            </Badge>
          );
        })}
      </div>
    </div>
  );
}
