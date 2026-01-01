import { useState, useEffect, useRef, useCallback } from 'react';
import { useTodaysFocus } from '@/hooks/useDailyFocus';
import { useFocusBacklog } from '@/hooks/useFocusBacklog';
import { useGlint } from '@/contexts/GlintContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Crosshair, Save, FolderOpen, ChevronDown, ChevronRight } from 'lucide-react';
import { FocusBacklogDialog } from './FocusBacklogDialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';

const FOCUS_COLLAPSED_KEY = 'noteshare_focus_collapsed';

export function TodaysFocus() {
  const { focus, isLoading, updateFocus, isUpdating } = useTodaysFocus();
  const { saveToBacklog, isSaving } = useFocusBacklog();
  const { setFocusFocused } = useGlint();
  const [text, setText] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isBacklogOpen, setIsBacklogOpen] = useState(false);
  const [isOpen, setIsOpen] = useState(() => {
    // Initialize from localStorage, default to expanded (true)
    const stored = localStorage.getItem(FOCUS_COLLAPSED_KEY);
    return stored === null ? true : stored === 'open';
  });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Persist collapsed state to localStorage
  useEffect(() => {
    localStorage.setItem(FOCUS_COLLAPSED_KEY, isOpen ? 'open' : 'collapsed');
  }, [isOpen]);

  // Sync isFocused state with glint context
  useEffect(() => {
    setFocusFocused(isFocused);
  }, [isFocused, setFocusFocused]);

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

  // Renumber all numbered list items from a given position
  const renumberList = useCallback((fromPos: number, currentText: string): string => {
    const lines = currentText.split('\n');
    let charCount = 0;
    let inNumberedList = false;
    let currentNumber = 0;
    let lastIndent = '';
    
    const newLines = lines.map((line) => {
      const lineStart = charCount;
      charCount += line.length + 1;
      
      const numberMatch = line.match(/^(\s*)(\d+)\.\s(.*)$/);
      
      if (numberMatch) {
        const [, indent, , content] = numberMatch;
        
        if (!inNumberedList || indent !== lastIndent) {
          inNumberedList = true;
          currentNumber = 1;
          lastIndent = indent;
        } else {
          currentNumber++;
        }
        
        return `${indent}${currentNumber}. ${content}`;
      } else {
        const bulletMatch = line.match(/^(\s*)[-•]\s/);
        if (!bulletMatch && line.trim() !== '') {
          inNumberedList = false;
          currentNumber = 0;
        }
        return line;
      }
    });
    
    return newLines.join('\n');
  }, []);

  // Auto-capitalize first letter after bullet/number prefix
  const autoCapitalizeAfterPrefix = useCallback((value: string, cursorPos: number): { newValue: string; newCursorPos: number } => {
    const lines = value.split('\n');
    let charCount = 0;
    let modified = false;
    
    const newLines = lines.map((line) => {
      const lineStart = charCount;
      const lineEnd = lineStart + line.length;
      charCount = lineEnd + 1;
      
      // Check if cursor is right after typing a character in this line
      if (cursorPos > lineStart && cursorPos <= lineEnd) {
        // Match bullet or number prefix followed by exactly one lowercase letter
        const bulletCapMatch = line.match(/^(\s*[-•]\s)([a-z])$/);
        const numberCapMatch = line.match(/^(\s*\d+\.\s)([a-z])$/);
        
        if (bulletCapMatch) {
          modified = true;
          return bulletCapMatch[1] + bulletCapMatch[2].toUpperCase();
        }
        if (numberCapMatch) {
          modified = true;
          return numberCapMatch[1] + numberCapMatch[2].toUpperCase();
        }
      }
      
      return line;
    });
    
    return { newValue: newLines.join('\n'), newCursorPos: cursorPos };
  }, []);

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
    
    let newValue = text.substring(0, lineStart) + newLine + text.substring(lineEnd);
    
    // Renumber if we modified a numbered list
    if (prefix === '1. ' || numberMatch) {
      newValue = renumberList(lineStart, newValue);
    }
    
    handleTextChange(newValue);
    
    setTimeout(() => {
      const newCursorPos = lineStart + newLine.length;
      textarea.selectionStart = textarea.selectionEnd = newCursorPos;
      textarea.focus();
    }, 0);
  }, [text, getLineInfo, renumberList]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = e.target as HTMLTextAreaElement;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    // Keyboard shortcuts for lists
    if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
      if (e.key === 'L' || e.key === 'l') {
        e.preventDefault();
        insertListPrefix('• ');
        return;
      }
      if (e.key === 'O' || e.key === 'o') {
        e.preventDefault();
        insertListPrefix('1. ');
        return;
      }
    }
    
    if (e.key === 'Tab') {
      e.preventDefault();
      const info = getLineInfo();
      if (!info) return;
      
      const { lineStart, line } = info;
      const indent = '  ';
      
      if (e.shiftKey) {
        if (line.startsWith(indent)) {
          let newValue = text.substring(0, lineStart) + line.substring(indent.length) + text.substring(info.lineEnd);
          newValue = renumberList(0, newValue);
          handleTextChange(newValue);
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = Math.max(lineStart, start - indent.length);
          }, 0);
        }
      } else {
        let newValue = text.substring(0, lineStart) + indent + text.substring(lineStart);
        newValue = renumberList(0, newValue);
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
            let newValue = text.substring(0, info.lineStart) + '\n' + text.substring(info.lineEnd);
            newValue = renumberList(0, newValue);
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
        
        let newValue = text.substring(0, start) + '\n' + prefix + text.substring(end);
        
        // Renumber if it's a numbered list
        if (numberMatch) {
          newValue = renumberList(0, newValue);
        }
        
        handleTextChange(newValue);
        
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 1 + prefix.length;
        }, 0);
      }
    }
  }, [text, getLineInfo, insertListPrefix, renumberList]);

  // Handle input for auto-conversion and auto-capitalization
  const handleInput = useCallback((e: React.FormEvent<HTMLTextAreaElement>) => {
    const textarea = e.target as HTMLTextAreaElement;
    let value = textarea.value;
    let cursorPos = textarea.selectionStart;
    
    // Find current line info
    let lineStart = cursorPos;
    while (lineStart > 0 && value[lineStart - 1] !== '\n') {
      lineStart--;
    }
    const lineBeforeCursor = value.substring(lineStart, cursorPos);
    
    // Auto-convert "- " at line start to bullet
    if (lineBeforeCursor === '- ' || lineBeforeCursor.match(/^\s+- $/)) {
      const indent = lineBeforeCursor.match(/^(\s*)/)?.[1] || '';
      value = value.substring(0, lineStart) + indent + '• ' + value.substring(cursorPos);
      cursorPos = lineStart + indent.length + 2;
      
      handleTextChange(value);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = cursorPos;
      }, 0);
      return;
    }
    
    // Mobile shortcut: ".- " creates a bullet
    if (lineBeforeCursor === '.- ' || lineBeforeCursor === '. - ') {
      const indent = '';
      value = value.substring(0, lineStart) + indent + '• ' + value.substring(cursorPos);
      cursorPos = lineStart + indent.length + 2;
      
      handleTextChange(value);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = cursorPos;
      }, 0);
      return;
    }
    
    // Auto-convert "1. " at line start to numbered list
    const numberStartMatch = lineBeforeCursor.match(/^(\s*)(\d+)\.\s$/);
    if (numberStartMatch) {
      // Already in correct format, just renumber
      value = renumberList(0, value);
    }
    
    // Auto-capitalize
    const { newValue, newCursorPos } = autoCapitalizeAfterPrefix(value, cursorPos);
    
    if (newValue !== textarea.value) {
      handleTextChange(newValue);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = newCursorPos;
      }, 0);
    } else {
      handleTextChange(value);
    }
  }, [renumberList, autoCapitalizeAfterPrefix]);

  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <div className="p-4 flex items-center gap-2">
          <Crosshair className="w-5 h-5 text-muted-foreground" />
          <h2 className="font-semibold">Today's Focus</h2>
        </div>
        <div className="px-4 pb-4">
          <div className="h-12 bg-muted/50 rounded animate-pulse" />
        </div>
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
      <Card className="bg-card border-border">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <button className="w-full p-4 flex items-center justify-between transition-colors rounded-lg group">
              <div className="flex items-center gap-2">
                <Crosshair className={`w-5 h-5 transition-colors ${isOpen ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`} />
                <h2 className="font-semibold">Today's Focus</h2>
              </div>
              <div className="flex items-center gap-1">
                {/* Buttons fade in when open */}
                <div className={`flex gap-1 transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 active:bg-transparent"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSaveToBacklog();
                    }}
                    disabled={isSaving || !text.trim()}
                    title="Save to backlog"
                  >
                    <Save className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 active:bg-transparent"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsBacklogOpen(true);
                    }}
                    title="View backlog"
                  >
                    <FolderOpen className="w-4 h-4" />
                  </Button>
                </div>
                {isOpen ? (
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="px-4 pb-4">
            <div 
              className={isFocused ? '' : 'cursor-text'}
              onClick={() => {
                if (!isFocused) {
                  textareaRef.current?.focus({ preventScroll: true });
                }
              }}
            >
              <Textarea
                ref={textareaRef}
                value={text}
                onInput={handleInput}
                onKeyDown={handleKeyDown}
                onFocus={(e) => {
                  e.target.scrollIntoView = () => {};
                  setIsFocused(true);
                }}
                onBlur={() => {
                  setIsFocused(false);
                  handleBlur();
                }}
                placeholder="What will you work on today?"
                className={`min-h-[36px] resize-none text-sm caret-foreground ${isFocused ? 'overflow-auto' : 'overflow-hidden pointer-events-none'}`}
                style={{ overscrollBehavior: 'contain' }}
                rows={1}
              />
            </div>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      <FocusBacklogDialog 
        open={isBacklogOpen} 
        onOpenChange={setIsBacklogOpen} 
      />
    </>
  );
}