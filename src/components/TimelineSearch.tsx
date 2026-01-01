import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Search, X, Calendar, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { SelectSingleEventHandler } from 'react-day-picker';

interface TimelineSearchProps {
  onSearch: (query: string) => void;
  onFocusDateFilter?: (date: Date | undefined) => void;
  focusDate?: Date;
  onTagFilter?: (tag: string | undefined) => void;
  selectedTag?: string;
  availableTags?: string[];
}

export function TimelineSearch({ 
  onSearch, 
  onFocusDateFilter, 
  focusDate,
  onTagFilter,
  selectedTag,
  availableTags = []
}: TimelineSearchProps) {
  const [query, setQuery] = useState('');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [tagFilterOpen, setTagFilterOpen] = useState(false);
  const [tagSearchQuery, setTagSearchQuery] = useState('');

  const handleChange = (value: string) => {
    setQuery(value);
    onSearch(value);
  };

  const handleClear = () => {
    setQuery('');
    onSearch('');
  };

  const handleClearFocusDate = () => {
    onFocusDateFilter?.(undefined);
  };

  const handleSelectTag = (tag: string) => {
    // Close popover first, then apply filter to avoid UI jump
    setTagFilterOpen(false);
    setTagSearchQuery('');
    // Small delay to let popover close smoothly before filter applies
    requestAnimationFrame(() => {
      onTagFilter?.(tag);
    });
  };

  const handleClearTag = () => {
    onTagFilter?.(undefined);
  };

  // Filter available tags by search query
  const filteredTags = tagSearchQuery
    ? availableTags.filter(tag => tag.toLowerCase().includes(tagSearchQuery.toLowerCase()))
    : availableTags;

  return (
    <div className="flex items-center gap-2 w-full min-w-0 justify-end">
      {/* Tag Filter - moved to left */}
      {availableTags.length > 0 && (
        <Popover open={tagFilterOpen} onOpenChange={setTagFilterOpen}>
          <PopoverTrigger asChild>
            <div
              className={cn(
                "cursor-pointer flex items-center justify-center h-9 w-9 shrink-0 rounded-lg bg-secondary/30 border border-border transition-colors hover:bg-secondary/50",
                selectedTag && "text-primary bg-primary/10 border-primary/20"
              )}
            >
              <Tag className="w-4 h-4" />
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-3 bg-popover" align="start">
            <div className="space-y-3">
              {/* Always show search input for discoverability */}
              <Input
                placeholder="Search tags..."
                value={tagSearchQuery}
                onChange={(e) => setTagSearchQuery(e.target.value)}
                className="h-8 text-sm"
                autoFocus
              />
              
              {/* Tag list */}
              <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
                {filteredTags.length > 0 ? (
                  filteredTags.map((tag) => (
                    <Badge
                      key={tag}
                      variant={selectedTag === tag ? "default" : "secondary"}
                      className={cn(
                        "text-xs px-2 py-0.5 cursor-pointer transition-colors",
                        selectedTag === tag 
                          ? "bg-primary text-primary-foreground" 
                          : "hover:bg-secondary/80"
                      )}
                      onClick={() => handleSelectTag(tag)}
                    >
                      {tag}
                    </Badge>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {tagSearchQuery ? 'No matching tags' : 'No tags yet'}
                  </p>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}
      
      {/* Selected tag pill */}
      {selectedTag && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground shrink-0"
          onClick={handleClearTag}
        >
          {selectedTag}
          <X className="w-3 h-3 ml-1" />
        </Button>
      )}
      

      {/* Search bar - narrower width */}
      <div className="relative w-[55%] min-w-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="..."
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          className="pl-9 pr-9 h-9 bg-secondary/30 border-border placeholder:text-muted-foreground w-full"
        />
        {query && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
            onClick={handleClear}
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
