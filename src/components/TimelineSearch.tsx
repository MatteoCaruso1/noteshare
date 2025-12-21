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
    onTagFilter?.(tag);
    setTagFilterOpen(false);
    setTagSearchQuery('');
  };

  const handleClearTag = () => {
    onTagFilter?.(undefined);
  };

  // Filter available tags by search query
  const filteredTags = tagSearchQuery
    ? availableTags.filter(tag => tag.toLowerCase().includes(tagSearchQuery.toLowerCase()))
    : availableTags;

  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search notes..."
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          className="pl-9 pr-9 h-9 bg-muted/50 border-border"
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
      
      {/* Tag Filter */}
      {availableTags.length > 0 && (
        <Popover open={tagFilterOpen} onOpenChange={setTagFilterOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-9 w-9 shrink-0",
                selectedTag && "text-primary bg-primary/10"
              )}
            >
              <Tag className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-3 bg-popover" align="end">
            <div className="space-y-3">
              {/* Search within tags */}
              {availableTags.length > 5 && (
                <Input
                  placeholder="Search tags..."
                  value={tagSearchQuery}
                  onChange={(e) => setTagSearchQuery(e.target.value)}
                  className="h-8 text-sm"
                />
              )}
              
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
                  <p className="text-xs text-muted-foreground">No tags found</p>
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
      
      {/* Date Filter */}
      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-9 w-9 shrink-0",
              focusDate && "text-primary bg-primary/10"
            )}
          >
            <Calendar className="w-4 h-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <CalendarComponent
            mode="single"
            selected={focusDate}
            onSelect={(date) => {
              onFocusDateFilter?.(date);
              setCalendarOpen(false);
            }}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>
      {focusDate && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground shrink-0"
          onClick={handleClearFocusDate}
        >
          {format(focusDate, 'M/d')}
          <X className="w-3 h-3 ml-1" />
        </Button>
      )}
    </div>
  );
}
