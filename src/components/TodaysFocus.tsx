import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { useTodaysFocus, FOCUS_CACHE_KEY } from '@/hooks/useDailyFocus';
import { useFocusBacklog } from '@/hooks/useFocusBacklog';
import { useGlint } from '@/contexts/GlintContext';
import { usePremium } from '@/contexts/PremiumContext';
import { useCheckboxToggle } from '@/hooks/useCheckboxToggle';
import { focusWithoutScroll, getScrollContainerFor, getScrollTop, restoreScrollNextFrame } from '@/lib/preserveScroll';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Kanban, Save, FolderOpen, ChevronDown, ChevronRight } from 'lucide-react';
import { FocusBacklogDialog } from './FocusBacklogDialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { useToast } from '@/hooks/use-toast';

const FOCUS_COLLAPSED_KEY = 'noteshare_focus_collapsed';

export function TodaysFocus() {
  const { focus, isLoading, updateFocus, isUpdating } = useTodaysFocus();
  const { saveToBacklog, isSaving } = useFocusBacklog();
  const { setFocusFocused } = useGlint();
  const { isPremium, openPremiumDialog } = usePremium();
  const { toast: structuredToast } = useToast();
  const [text, setText] = useState(() => {
    try {
      const raw = localStorage.getItem(FOCUS_CACHE_KEY);
      if (raw) return (JSON.parse(raw) as { focus_text: string }).focus_text || '';
    } catch {}
    return '';
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isInitialized, setIsInitialized] = useState(() => {
    try {
      return !!localStorage.getItem(FOCUS_CACHE_KEY);
    } catch { return false; }
  });
  const [isBacklogOpen, setIsBacklogOpen] = useState(false);
  // isRestoring removed — CSS grid mirror approach makes it unnecessary
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

  // No-op kept for compatibility with existing call sites.
  // Height is now driven entirely by the CSS grid mirror div.
  const autosizeTextarea = useCallback(() => {
    // Force a reflow on the textarea just in case (e.g. font loading)
    const textarea = textareaRef.current;
    if (textarea) void textarea.offsetHeight;
    return 0;
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

  // bfcache / visibility — no special handling needed since CSS grid drives height

  // MutationObserver for Radix CollapsibleContent hidden attribute changes
  // When Radix removes the hidden attribute during transitions, we need to re-measure
  useEffect(() => {
    if (!isOpen) return;
    const contentEl = collapsibleContentRef.current;
    if (!contentEl) return;
    
    // Watch for Radix removing the hidden attribute (happens during transitions)
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'hidden') {
          // Hidden state changed - re-measure after paint
          requestAnimationFrame(() => {
            autosizeTextarea();
          });
        }
      }
    });
    
    observer.observe(contentEl, { attributes: true, attributeFilter: ['hidden'] });
    
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

  // Flush pending save on unmount (e.g. navigating away)
  const textRef = useRef(text);
  const hasChangesRef = useRef(hasChanges);
  textRef.current = text;
  hasChangesRef.current = hasChanges;

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      // Save any unsaved changes before unmounting
      if (hasChangesRef.current) {
        updateFocus(textRef.current);
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

  // Auto-capitalize first letter after bullet/number/checkbox prefix
  const autoCapitalizeAfterPrefix = useCallback((value: string, cursorPos: number): { newValue: string; newCursorPos: number } => {
    const lines = value.split('\n');
    let charCount = 0;
    let modified = false;
    
    const newLines = lines.map((line) => {
      const lineStart = charCount;
      const lineEnd = lineStart + line.length;
      charCount = lineEnd + 1;
      
      // Check if cursor is on this line
      if (cursorPos > lineStart && cursorPos <= lineEnd) {
        const relativeCursor = cursorPos - lineStart;
        
        // Match bullet, number, or checkbox prefix followed by text starting with a lowercase letter
        const bulletCapMatch = line.match(/^(\s*[-•]\s)([a-z])(.*)$/);
        const numberCapMatch = line.match(/^(\s*\d+\.\s)([a-z])(.*)$/);
        const checkboxCapMatch = line.match(/^(\s*[☐☑]\s)([a-z])(.*)$/);
        
        const match = bulletCapMatch || numberCapMatch || checkboxCapMatch;
        
        if (match) {
          const prefixLen = match[1].length;
          // Only capitalize if the cursor is right after the first letter (just typed it)
          // OR if the line has exactly prefix + 1 char (first letter scenario)
          if (relativeCursor === prefixLen + 1 || line.length === prefixLen + 1) {
            modified = true;
            return match[1] + match[2].toUpperCase() + (match[3] || '');
          }
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
      const checkboxMatch = line.match(/^(\s*)(☐|☑)\s/);
      
      // Handle checkbox lists
      if (checkboxMatch) {
        const contentAfterPrefix = line.replace(/^(\s*)(☐|☑)\s/, '');
        
        if (contentAfterPrefix.trim() === '') {
          // Empty checkbox line - clear it
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
        
        // Continue checkbox list
        e.preventDefault();
        const indent = checkboxMatch[1];
        const prefix = indent + '☐ ';
        
        const newValue = text.substring(0, start) + '\n' + prefix + text.substring(end);
        handleTextChange(newValue);
        
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 1 + prefix.length;
        }, 0);
        return;
      }
      
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
    
    // Auto-convert "[]" or "[ ]" at line start to checkbox (immediately, no space needed)
    const checkboxPatternMatch = lineBeforeCursor.match(/^(\s*)\[\]$/) || lineBeforeCursor.match(/^(\s*)\[ \]$/);
    if (checkboxPatternMatch) {
      const scrollContainer = getScrollContainerFor(textarea);
      const savedScrollTop = getScrollTop(scrollContainer);

      const indent = checkboxPatternMatch[1];
      const patternLength = lineBeforeCursor.length - indent.length; // 2 for [] or 3 for [ ]
      value = value.substring(0, lineStart) + indent + '☐ ' + value.substring(cursorPos);
      cursorPos = lineStart + indent.length + 2; // Position after "☐ "
      
      handleTextChange(value);
      setTimeout(() => {
        focusWithoutScroll(textarea);
        textarea.setSelectionRange(cursorPos, cursorPos);
        restoreScrollNextFrame(scrollContainer, savedScrollTop);
      }, 0);
      return;
    }
    
    // Auto-convert "-" at line start to bullet (no space required)
    const dashMatch = lineBeforeCursor.match(/^(\s*)-$/);
    if (dashMatch) {
      const indent = dashMatch[1];
      value = value.substring(0, lineStart) + indent + '• ' + value.substring(cursorPos);
      cursorPos = lineStart + indent.length + 2;
      
      // Check if there's already a character after the cursor to auto-capitalize
      const charAfter = value[cursorPos];
      if (charAfter && /[a-z]/.test(charAfter)) {
        value = value.substring(0, cursorPos) + charAfter.toUpperCase() + value.substring(cursorPos + 1);
      }
      
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

  // Checkbox toggle with haptic feedback and protection
  const performCheckboxToggle = useCallback((lineIndex: number, isNowChecked: boolean) => {
    const lines = text.split('\n');
    if (lineIndex < 0 || lineIndex >= lines.length) return;
    
    const line = lines[lineIndex];
    const checkboxMatch = line.match(/^(\s*)(☐|☑)\s/);
    if (!checkboxMatch) return;
    
    const indent = checkboxMatch[1];
    const newCheckbox = isNowChecked ? '☑' : '☐';
    const newLine = indent + newCheckbox + line.substring(indent.length + 1);
    
    lines[lineIndex] = newLine;
    handleTextChange(lines.join('\n'));
  }, [text, handleTextChange]);

  const { 
    toggleCheckbox, 
    getLineIndexFromY, 
    isInCheckboxZone, 
    isOnCheckbox 
  } = useCheckboxToggle({
    onToggle: performCheckboxToggle,
    getText: () => text,
    requireDoubleToUncheck: false, // Single tap for both check and uncheck - better mobile UX
  });

  // Handle touch end for mobile checkbox toggling
  const handleTouchEnd = useCallback((e: React.TouchEvent<HTMLTextAreaElement>) => {
    const textarea = e.target as HTMLTextAreaElement;
    const touch = e.changedTouches[0];
    if (!touch) return;
    
    // Check if touch is in the checkbox zone (left side)
    if (!isInCheckboxZone(textarea, touch.clientX)) return;
    
    const lineIndex = getLineIndexFromY(textarea, touch.clientY);
    const lines = text.split('\n');
    
    if (lineIndex >= 0 && lineIndex < lines.length) {
      const line = lines[lineIndex];
      if (line.match(/^(\s*)(☐|☑)\s/)) {
        // Prevent the default behavior that would move the cursor
        e.preventDefault();

        const scrollContainer = getScrollContainerFor(textarea);
        const savedScrollTop = getScrollTop(scrollContainer);
        
        // Store current selection to restore it
        const savedStart = textarea.selectionStart;
        const savedEnd = textarea.selectionEnd;
        
        // Toggle the checkbox (with haptic feedback and double-tap protection)
        toggleCheckbox(lineIndex);
        
        // Restore cursor position after the state update
        setTimeout(() => {
          focusWithoutScroll(textarea);
          textarea.setSelectionRange(savedStart, savedEnd);
          restoreScrollNextFrame(scrollContainer, savedScrollTop);
        }, 0);
      }
    }
  }, [text, toggleCheckbox, getLineIndexFromY, isInCheckboxZone]);

  // Handle clicks on checkbox characters to toggle them (desktop)
  const handleClick = useCallback((e: React.MouseEvent<HTMLTextAreaElement>) => {
    const textarea = e.target as HTMLTextAreaElement;
    const cursorPos = textarea.selectionStart;
    
    const { isCheckbox, lineIndex } = isOnCheckbox(text, cursorPos);
    
    if (isCheckbox && lineIndex !== -1) {
      const scrollContainer = getScrollContainerFor(textarea);
      const savedScrollTop = getScrollTop(scrollContainer);

      toggleCheckbox(lineIndex);

      setTimeout(() => {
        focusWithoutScroll(textarea);
        textarea.setSelectionRange(cursorPos, cursorPos);
        restoreScrollNextFrame(scrollContainer, savedScrollTop);
      }, 0);
    }
  }, [text, toggleCheckbox, isOnCheckbox]);

  // Handle mouse move for checkbox hover cursor
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLTextAreaElement>) => {
    const textarea = e.target as HTMLTextAreaElement;
    
    if (isInCheckboxZone(textarea, e.clientX)) {
      const lineIndex = getLineIndexFromY(textarea, e.clientY);
      const lines = text.split('\n');
      
      if (lineIndex >= 0 && lineIndex < lines.length) {
        const line = lines[lineIndex];
        if (line.match(/^(\s*)(☐|☑)\s/)) {
          textarea.style.cursor = 'pointer';
          return;
        }
      }
    }
    textarea.style.cursor = 'text';
  }, [text, isInCheckboxZone, getLineIndexFromY]);

  const handleMouseLeave = useCallback((e: React.MouseEvent<HTMLTextAreaElement>) => {
    (e.target as HTMLTextAreaElement).style.cursor = 'text';
  }, []);

  // Read localStorage during loading to match the expected loaded state
  const storedIsOpen = localStorage.getItem(FOCUS_COLLAPSED_KEY);
  const willBeOpen = storedIsOpen === null ? true : storedIsOpen === 'open';

  // Loading state — only show skeleton if no cached data available
  if (isLoading && !focus) {
    return (
      <Card className="bg-card border-border min-h-[60px]">
        <div className="px-3 py-4 sm:px-4 flex items-center gap-2">
          <Kanban className="w-5 h-5 text-muted-foreground" />
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
      structuredToast({
        title: "Pro Feature",
        description: "Saving to backlog is available for Pro users.",
        action: (
          <button
            onClick={openPremiumDialog}
            className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            See Pro
          </button>
        ),
      });
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
            <div className="px-3 py-4 sm:px-4 flex items-center justify-between cursor-pointer group touch-manipulation">
              <div className="flex items-center gap-2">
                <Kanban className={`w-5 h-5 transition-colors ${isOpen ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`} />
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
                          className={`h-7 w-7 p-0 active:bg-transparent ${!isPremium ? 'text-muted-foreground opacity-50' : ''}`}
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
                          className={`h-7 w-7 p-0 active:bg-transparent ${!isPremium ? 'text-muted-foreground opacity-50' : ''}`}
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
          <CollapsibleContent className="px-3 sm:px-4 pb-4" style={{ overflow: 'visible' }}>
            <div ref={collapsibleContentRef}>
              {/* CSS grid mirror approach: a hidden div renders the same text to drive
                  the container height. The textarea overlays it. This is immune to
                  bfcache / tab-switch measurement failures. */}
              <div className="grid" style={{ gridTemplateColumns: '1fr' }}>
                {/* Mirror div — invisible, drives height */}
                {/* Mirror div — must match textarea's padding, border, font exactly */}
                <div
                  aria-hidden
                  className="practice-board-textarea pointer-events-none invisible min-h-[36px] whitespace-pre-wrap break-words text-sm px-3 py-2 border border-transparent rounded-md"
                  style={{ gridArea: '1 / 1', overflow: 'hidden' }}
                >
                  {/* Trailing zero-width space ensures trailing newlines get height */}
                  {(text || ' ') + '\u200b'}
                </div>
                <Textarea
                  ref={textareaRef}
                  value={text}
                  onInput={handleInput}
                  onPaste={handlePaste}
                  onKeyDown={handleKeyDown}
                  onClick={handleClick}
                  onTouchEnd={handleTouchEnd}
                  onMouseMove={handleMouseMove}
                  onMouseLeave={handleMouseLeave}
                  onFocus={(e) => {
                    e.target.scrollIntoView = () => {};
                    setIsFocused(true);
                  }}
                  onBlur={() => {
                    setIsFocused(false);
                    handleBlur();
                  }}
                  placeholder="What is your practice to-do list?"
                  className={`practice-board-textarea min-h-[36px] resize-none text-sm caret-foreground ${isFocused ? '' : 'cursor-text'}`}
                  style={{ gridArea: '1 / 1', overscrollBehavior: 'contain', overflow: 'hidden', height: '100%' }}
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