import { useState, useEffect, useRef } from 'react';
import { useTodaysFocus } from '@/hooks/useDailyFocus';
import { Card } from '@/components/ui/card';
import { Crosshair } from 'lucide-react';

export function TodaysFocus() {
  const { focus, isLoading, updateFocus, isUpdating } = useTodaysFocus();
  const [text, setText] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize text from focus data
  useEffect(() => {
    if (focus?.focus_text !== undefined) {
      setText(focus.focus_text);
    }
  }, [focus?.focus_text]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(48, textareaRef.current.scrollHeight)}px`;
    }
  }, [text]);

  // Auto-save with debounce
  const handleTextChange = (value: string) => {
    setText(value);
    setHasChanges(true);

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout to save after 1 second of inactivity
    saveTimeoutRef.current = setTimeout(() => {
      updateFocus(value);
      setHasChanges(false);
    }, 1000);
  };

  // Save on blur immediately
  const handleBlur = () => {
    if (hasChanges) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      updateFocus(text);
      setHasChanges(false);
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  if (isLoading) {
    return (
      <Card className="p-4 bg-card border-border">
        <div className="flex items-center gap-2 mb-2">
          <Crosshair className="w-5 h-5 text-muted-foreground" />
          <h2 className="font-semibold">Today's Focus</h2>
        </div>
        <div className="h-12 bg-muted/50 rounded animate-pulse" />
      </Card>
    );
  }

  return (
    <Card className="p-4 bg-card border-border">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Crosshair className="w-5 h-5 text-primary" />
          <h2 className="font-semibold">Today's Focus</h2>
        </div>
        {(isUpdating || hasChanges) && (
          <span className="text-xs text-muted-foreground">
            {isUpdating ? 'Saving...' : 'Unsaved'}
          </span>
        )}
      </div>
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => handleTextChange(e.target.value)}
        onBlur={handleBlur}
        placeholder="What's your focus for today? What do you want to accomplish?"
        className="w-full min-h-[48px] resize-none bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-0 border-0 p-0"
        rows={1}
      />
    </Card>
  );
}
