import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { useTodaysFocus } from '@/hooks/useDailyFocus';
import { useFocusBacklog } from '@/hooks/useFocusBacklog';
import { useGlint } from '@/contexts/GlintContext';
import { usePremium } from '@/contexts/PremiumContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ClipboardList, Save, FolderOpen, ChevronDown, ChevronRight } from 'lucide-react';
import { FocusBacklogDialog } from './FocusBacklogDialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';

const FOCUS_COLLAPSED_KEY = 'noteshare_focus_collapsed';

export function TodaysFocus() {
  const { focus, isLoading, updateFocus, isUpdating } = useTodaysFocus();
  const { saveToBacklog, isSaving } = useFocusBacklog();
  const { setFocusFocused } = useGlint();
  const { isPremium, openPremiumDialog } = usePremium();
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
  const collapsibleContentRef = useRef<HTMLDivElement>(null);

  // Persist collapsed state to localStorage
  useEffect(() => {
    localStorage.setItem(FOCUS_COLLAPSED_KEY, isOpen ? 'open' : 'collapsed');
  }, [isOpen]);

  // Sync isFocused state with glint context
  useEffect(() => {
    setFocusFocused(isFocused);
  }, [isFocused, setFocusFocused]);

  // Stable autosize function - sets height to content without timeouts
  const autosizeTextarea = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.max(36, textarea.scrollHeight)}px`;
  }, []);

  // Initialize text from focus data - only once on initial load
  useEffect(() => {
    if (!isInitialized && focus?.focus_text !== undefined) {
      setText(focus.focus_text);
      setIsInitialized(true);
    }
  }, [focus?.focus_text, isInitialized]);

  // Deterministic autosize using useLayoutEffect - runs before paint
  // Triggers on: isOpen change, text change, initialization
  // IMPORTANT: Radix CollapsibleContent uses CSS animations for open/close transitions.
  // We need to wait for the animation to complete before measuring scrollHeight.
  useLayoutEffect(() => {
    if (!isOpen) return;
    
    // Run autosize immediately for already-expanded cases
    autosizeTextarea();
    
    const contentEl = collapsibleContentRef.current;
    
    // Handler for when animation completes
    const handleAnimationEnd = () => {
      autosizeTextarea();
    };
    
    // Listen for CSS transition/animation end events on the collapsible content
    if (contentEl) {
      contentEl.addEventListener('transitionend', handleAnimationEnd);
      contentEl.addEventListener('animationend', handleAnimationEnd);
    }
    
    // Fallback timeout: Radix animations are typically ~200-300ms
    // This ensures autosize runs even if animation events don't fire
    // (e.g., prefers-reduced-motion, or if animation is already complete)
    const fallbackTimeout = setTimeout(() => {
      autosizeTextarea();
    }, 350);
    
    return () => {
      if (contentEl) {
        contentEl.removeEventListener('transitionend', handleAnimationEnd);
        contentEl.removeEventListener('animationend', handleAnimationEnd);
      }
      clearTimeout(fallbackTimeout);
    };
  }, [isOpen, text, isInitialized, autosizeTextarea]);

  // Special case: When data loads while the collapsible is already open,
  // ensure we wait for any ongoing animations before final measurement
  useEffect(() => {
    if (isInitialized && isOpen) {
      // Schedule autosize after typical Radix animation duration
      const timeoutId = setTimeout(autosizeTextarea, 350);
      return () => clearTimeout(timeoutId);
    }
  }, [isInitialized]); // Only trigger when isInitialized changes

  // Dedicated effect for when text content changes after initial mount
  // This handles the race condition where database data arrives after the 350ms fallback
  useEffect(() => {
    if (isOpen && text && isInitialized) {
      // Double RAF ensures DOM has fully rendered the new text before measuring
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          autosizeTextarea();
        });
      });
    }
  }, [text, isOpen, isInitialized, autosizeTextarea]);

  // ResizeObserver to handle viewport/container size changes while open
  useEffect(() => {
    if (!isOpen) return;
    const textarea = textareaRef.current;
    if (!textarea) return;

    const observer = new ResizeObserver(() => {
      // Re-autosize when container width changes (affects text wrapping)
      autosizeTextarea();
    });

    observer.observe(textarea);
    return () => observer.disconnect();
  }, [isOpen, autosizeTextarea]);

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

  // Track if we're pasting to skip auto-formatting
  const isPastingRef = useRef(false);

  const handlePaste = useCallback(() => {
    isPastingRef.current = true;
    // Reset after a short delay to allow paste to complete
    setTimeout(() => {
      isPastingRef.current = false;
    }, 100);
  }, []);

  // Handle input for auto-conversion and auto-capitalization
  const handleInput = useCallback((e: React.FormEvent<HTMLTextAreaElement>) => {
    const textarea = e.target as HTMLTextAreaElement;
    let value = textarea.value;
    let cursorPos = textarea.selectionStart;
    
    // Skip auto-formatting during paste operations
    if (isPastingRef.current) {
      handleTextChange(value);
      return;
    }
    
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

  // Read localStorage during loading to match the expected loaded state
  const storedIsOpen = localStorage.getItem(FOCUS_COLLAPSED_KEY);
  const willBeOpen = storedIsOpen === null ? true : storedIsOpen === 'open';

  // Loading state with stable min-height to prevent layout shifts
  if (isLoading) {
    return (
      <Card className="bg-card border-border min-h-[60px]">
        <div className="p-4 flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-muted-foreground" />
          <h2 className="font-semibold">Practice Board</h2>
        </div>
        {willBeOpen && (
          <div className="px-4 pb-4">
            {/* Reserve realistic height to prevent layout shift during scroll restoration */}
            <div className="min-h-[120px] bg-muted/50 rounded animate-pulse" />
          </div>
        )}
      </Card>
    );
  }

  const handleSaveToBacklog = () => {
    if (!isPremium) {
      toast.error('Save to backlog is a Pro feature');
      return;
    }
    
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
          {/* Header row - trigger spans full width with chevron on the right */}
          <CollapsibleTrigger asChild>
            <div className="p-4 flex items-center justify-between cursor-pointer group touch-manipulation">
              <div className="flex items-center gap-2">
                <ClipboardList className={`w-5 h-5 transition-colors ${isOpen ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`} />
                <h2 className="font-semibold">Practice Board</h2>
              </div>
              
              <div className="flex items-center gap-1">
                {/* Action buttons - stop propagation to prevent triggering collapse */}
                <TooltipProvider delayDuration={300}>
                  <div className={`flex gap-1 transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className={`h-7 w-7 p-0 active:bg-transparent ${!isPremium ? 'text-jazz-amber' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSaveToBacklog();
                          }}
                          disabled={isSaving || !text.trim()}
                        >
                          <Save className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Save to backlog</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className={`h-7 w-7 p-0 active:bg-transparent ${!isPremium ? 'text-jazz-amber' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsBacklogOpen(true);
                          }}
                        >
                          <FolderOpen className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>View backlog</TooltipContent>
                    </Tooltip>
                  </div>
                </TooltipProvider>
                
                {/* Chevron on the right */}
                {isOpen ? (
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="px-4 pb-4" style={{ overflow: 'visible' }}>
            <div ref={collapsibleContentRef}>
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
                  onPaste={handlePaste}
                  onKeyDown={handleKeyDown}
                  onFocus={(e) => {
                    e.target.scrollIntoView = () => {};
                    setIsFocused(true);
                  }}
                  onBlur={() => {
                    setIsFocused(false);
                    handleBlur();
                  }}
                  placeholder="What are you practicing across sessions?"
                  className="practice-board-textarea min-h-[36px] resize-none text-sm caret-foreground overflow-hidden"
                  style={{ overscrollBehavior: 'contain' }}
                  rows={1}
                />
              </div>
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