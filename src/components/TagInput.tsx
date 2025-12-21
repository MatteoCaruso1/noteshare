import { useState, useCallback, KeyboardEvent } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Tag, X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  recentTags?: string[];
  iconOnly?: boolean;
  className?: string;
}

export function TagInput({ tags, onChange, recentTags = [], iconOnly = false, className }: TagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const handleAddTag = useCallback((tag: string) => {
    const trimmedTag = tag.trim().toLowerCase();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      onChange([...tags, trimmedTag]);
    }
    setInputValue('');
  }, [tags, onChange]);

  const handleRemoveTag = useCallback((tagToRemove: string) => {
    onChange(tags.filter(t => t !== tagToRemove));
  }, [tags, onChange]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      handleRemoveTag(tags[tags.length - 1]);
    }
  }, [inputValue, tags, handleAddTag, handleRemoveTag]);

  // Filter recent tags to show only ones not already added
  const availableRecentTags = recentTags.filter(t => !tags.includes(t));

  if (iconOnly) {
    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className={cn("h-8 w-8", tags.length > 0 && "text-primary", className)}
              >
                <Tag className="w-4 h-4" />
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>Add tags</TooltipContent>
        </Tooltip>
        <PopoverContent className="w-64 p-3 bg-popover" align="start">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Add tag..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                className="h-8 text-sm"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => handleAddTag(inputValue)}
                disabled={!inputValue.trim()}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            
            {/* Current tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="text-xs px-2 py-0.5 bg-secondary text-secondary-foreground"
                  >
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {/* Recent tags suggestions */}
            {availableRecentTags.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">Recent</p>
                <div className="flex flex-wrap gap-1.5">
                  {availableRecentTags.slice(0, 8).map((tag) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="text-xs px-2 py-0.5 cursor-pointer hover:bg-secondary transition-colors"
                      onClick={() => handleAddTag(tag)}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  // Inline mode (not used currently but available)
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2">
        <Tag className="w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Add tags..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="h-8 text-sm"
        />
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="text-xs px-2 py-0.5"
            >
              {tag}
              <button
                onClick={() => handleRemoveTag(tag)}
                className="ml-1 hover:text-destructive"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
