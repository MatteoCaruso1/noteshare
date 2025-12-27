import { useState, useEffect, useRef, useCallback } from 'react';
import { useTodaysFocus } from '@/hooks/useDailyFocus';
import { useFocusBacklog } from '@/hooks/useFocusBacklog';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Crosshair, List, ListOrdered, Save, FolderOpen } from 'lucide-react';
import { FocusBacklogDialog } from './FocusBacklogDialog';
import { toast } from 'sonner';

export function TodaysFocus() {
  const { focus, isLoading, updateFocus, isUpdating } = useTodaysFocus();
  const { saveToBacklog, isSaving } = useFocusBacklog();
  const [text, setText] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isBacklogOpen, setIsBacklogOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize text from focus data - only once on initial load
  useEffect(() => {
    if (!isInitialized && focus?.focus_text !== undefined) {
      setText(focus.focus_text);
      setIsInitialized(true);
    }
  }, [focus?.focus_text, isInitialized]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(36, textareaRef.current.scrollHeight)}px`;
    }
  }, [text]);

  // Auto-save with debounce
  const handleTextChange = (value: string) => {
    setText(value);
    setHasChanges(true);

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

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

  // Rich text helpers
  const getLineInfo = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return null;
    
    const start = textarea.selectionStart;
    
    let lineStart = start;
    while (lineStart > 0 && text[lineStart - 1] !== '\n') {
      lineStart--;
    }
    
    let lineEnd = start;
    while (lineEnd < text.length && text[lineEnd] !== '\n') {
      lineEnd++;
    }
    
    const line = text.substring(lineStart, lineEnd);
    return { lineStart, lineEnd, line, cursorPos: start };
  }, [text]);

  const insertListPrefix = useCallback((prefix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const info = getLineInfo();
    if (!info) return;
    
    const { lineStart, lineEnd, line } = info;
    
    const bulletMatch = line.match(/^(\s*)([-•]\s)/);
    const numberMatch = line.match(/^(\s*)(\d+\.\s)/);
    
    let newLine: string;
    
    if (prefix === '• ') {
      if (bulletMatch) {
        newLine = line.replace(/^(\s*)[-•]\s/, '$1');
      } else if (numberMatch) {
        newLine = line.replace(/^(\s*)\d+\.\s/, '$1• ');
      } else {
        newLine = '• ' + line;
      }
    } else {
      if (numberMatch) {
        newLine = line.replace(/^(\s*)\d+\.\s/, '$1');
      } else if (bulletMatch) {
        newLine = line.replace(/^(\s*)[-•]\s/, '$11. ');
      } else {
        newLine = '1. ' + line;
      }
    }
    
    const newValue = text.substring(0, lineStart) + newLine + text.substring(lineEnd);
    handleTextChange(newValue);
    
    setTimeout(() => {
      const newCursorPos = lineStart + newLine.length;
      textarea.selectionStart = textarea.selectionEnd = newCursorPos;
      textarea.focus();
    }, 0);
  }, [text, getLineInfo]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = e.target as HTMLTextAreaElement;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    if (e.key === 'Tab') {
      e.preventDefault();
      const info = getLineInfo();
      if (!info) return;
      
      const { lineStart, line } = info;
      const indent = '  ';
      
      if (e.shiftKey) {
        if (line.startsWith(indent)) {
          const newValue = text.substring(0, lineStart) + line.substring(indent.length) + text.substring(info.lineEnd);
          handleTextChange(newValue);
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = Math.max(lineStart, start - indent.length);
          }, 0);
        }
      } else {
        const newValue = text.substring(0, lineStart) + indent + text.substring(lineStart);
        handleTextChange(newValue);
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + indent.length;
        }, 0);
      }
      return;
    }
    
    if (e.key === 'Enter') {
      const info = getLineInfo();
      if (!info) return;
      
      const { line } = info;
      const bulletMatch = line.match(/^(\s*)([-•])\s/);
      const numberMatch = line.match(/^(\s*)(\d+)\.\s/);
      
      if (bulletMatch || numberMatch) {
        const contentAfterPrefix = bulletMatch 
          ? line.replace(/^(\s*)[-•]\s/, '')
          : line.replace(/^(\s*)\d+\.\s/, '');
        
        if (contentAfterPrefix.trim() === '') {
          e.preventDefault();
          const info = getLineInfo();
          if (info) {
            const newValue = text.substring(0, info.lineStart) + '\n' + text.substring(info.lineEnd);
            handleTextChange(newValue);
            setTimeout(() => {
              textarea.selectionStart = textarea.selectionEnd = info.lineStart + 1;
            }, 0);
          }
          return;
        }
        
        e.preventDefault();
        const indent = bulletMatch ? bulletMatch[1] : numberMatch![1];
        let prefix: string;
        
        if (bulletMatch) {
          prefix = indent + bulletMatch[2] + ' ';
        } else {
          const num = parseInt(numberMatch![2]) + 1;
          prefix = indent + num + '. ';
        }
        
        const newValue = text.substring(0, start) + '\n' + prefix + text.substring(end);
        handleTextChange(newValue);
        
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 1 + prefix.length;
        }, 0);
      }
    }
  }, [text, getLineInfo]);

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

  const handleSaveToBacklog = () => {
    if (!text.trim()) {
      toast.error('Nothing to save');
      return;
    }
    
    saveToBacklog(
      { 
        focusText: text, 
        originalFocusDate: focus?.focus_date 
      },
      {
        onSuccess: () => {
          toast.success('Saved to backlog');
        },
        onError: () => {
          toast.error('Failed to save to backlog');
        },
      }
    );
  };

  return (
    <>
      <Card className="p-4 bg-card border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Crosshair className={`w-5 h-5 transition-colors ${isFocused ? 'text-primary' : 'text-muted-foreground'}`} />
            <h2 className="font-semibold">Today's Focus</h2>
          </div>
          <div className="flex gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => insertListPrefix('• ')}
              title="Bullet list"
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => insertListPrefix('1. ')}
              title="Numbered list"
            >
              <ListOrdered className="w-4 h-4" />
            </Button>
            <div className="w-px h-5 bg-border mx-1 self-center" />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={handleSaveToBacklog}
              disabled={isSaving || !text.trim()}
              title="Save to backlog"
            >
              <Save className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setIsBacklogOpen(true)}
              title="View backlog"
            >
              <FolderOpen className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <Textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setIsFocused(false);
            handleBlur();
          }}
          placeholder="What will you work on today?"
          className="min-h-[36px] resize-none text-sm"
          rows={1}
        />
      </Card>

      <FocusBacklogDialog 
        open={isBacklogOpen} 
        onOpenChange={setIsBacklogOpen} 
      />
    </>
  );
}
