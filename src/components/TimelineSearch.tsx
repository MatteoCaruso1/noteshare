import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TimelineSearchProps {
  onSearch: (query: string) => void;
}

export function TimelineSearch({ 
  onSearch, 
}: TimelineSearchProps) {
  const [query, setQuery] = useState('');

  const handleChange = (value: string) => {
    setQuery(value);
    onSearch(value);
  };

  const handleClear = () => {
    setQuery('');
    onSearch('');
  };

  return (
    <div className="flex items-center gap-2 w-full min-w-0 justify-end">
      {/* Search bar */}
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
