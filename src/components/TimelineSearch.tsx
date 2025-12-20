import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Search, X, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

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
      
      {/* Date Filter */}
      <Popover>
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
            onSelect={onFocusDateFilter}
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
