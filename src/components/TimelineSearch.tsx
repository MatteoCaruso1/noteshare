import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Search, X, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';

interface TimelineSearchProps {
  onSearch: (query: string) => void;
  onFocusDateFilter?: (date: Date | undefined) => void;
  focusDate?: Date;
}

export function TimelineSearch({ onSearch, onFocusDateFilter, focusDate }: TimelineSearchProps) {
  const [query, setQuery] = useState('');

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

  return (
    <div className="space-y-2">
      <div className="relative">
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
      
      {/* Focus Date Filter */}
      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={`h-8 gap-2 text-xs ${focusDate ? 'bg-primary/10 border-primary/30' : ''}`}
            >
              <Calendar className="w-3.5 h-3.5" />
              {focusDate ? format(focusDate, 'MMM d, yyyy') : 'Filter by Focus Date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <CalendarComponent
              mode="single"
              selected={focusDate}
              onSelect={onFocusDateFilter}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        {focusDate && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={handleClearFocusDate}
          >
            <X className="w-3.5 h-3.5 mr-1" />
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
