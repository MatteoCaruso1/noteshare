import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { useTodaysFocus, readFocusCache, readDraft, writeDraft } from '@/hooks/useDailyFocus';
import { useFocusBacklog } from '@/hooks/useFocusBacklog';
import { useGlint } from '@/contexts/GlintContext';
import { useAuth } from '@/hooks/useAuth';
import { usePremium } from '@/contexts/PremiumContext';
import { useCheckboxToggle } from '@/hooks/useCheckboxToggle';
import { focusWithoutScroll, getScrollContainerFor, getScrollTop, restoreScrollNextFrame } from '@/lib/preserveScroll';
import { useFTUEPreview } from '@/contexts/FTUEPreviewContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

import { ListTodo, ChevronDown } from 'lucide-react';
import { RoutineSwitcherPopover } from './RoutineSwitcherPopover';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';


const FOCUS_COLLAPSED_KEY = 'noteshare_focus_collapsed';

export function TodaysFocus() {
  const { focus, isLoading, updateFocus, updateFocusAsync, isUpdating } = useTodaysFocus();
  const { profile: authProfile } = useAuth();
  const ftuePreview = useFTUEPreview();
  const profile = ftuePreview.isFTUEPreview ? ftuePreview.previewProfile : authProfile;
  const profileId = profile?.id;
  const { backlogEntries, isLoading: isBacklogLoading, saveToBacklog, isSaving, deleteFromBacklog } = useFocusBacklog();
  const { setFocusFocused } = useGlint();
  const { isPremium, openPremiumDialog } = usePremium();
  

  // Initialize text from: draft > persisted cache > empty
  const [text, setText] = useState(() => {
    const draft = readDraft(profileId);
    if (draft) return draft.text;
    const cached = readFocusCache(profileId);
    return cached?.focus_text || '';
  });
  const [title, setTitle] = useState(() => {
    const cached = readFocusCache(profileId);
    return cached?.focus_title || '';
  });
  const [hasChanges, setHasChanges] = useState(false);
  // Track the last-saved title so we can clean up old backlog entries on rename
  const savedTitleRef = useRef(title);
  const [isFocused, setIsFocused] = useState(false);
  const [isOpen, setIsOpen] = useState(() => {
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

  const autosizeTextarea = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) void textarea.offsetHeight;
    return 0;
  }, []);

  // Re-hydrate local UI state when profile changes (login/logout)
  useEffect(() => {
    const draft = readDraft(profileId);
    if (draft) {
      setText(draft.text);
    } else {
      const cached = readFocusCache(profileId);
      setText(cached?.focus_text || '');
    }
    const cached = readFocusCache(profileId);
    setTitle(cached?.focus_title || '');
    setHasChanges(false);
  }, [profileId]);

  // Sync fresh DB data to local state when it arrives (cross-device sync)
  // Only update if user is NOT actively editing (no pending changes)
  const prevFocusTextRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!focus?.focus_text && focus?.focus_text !== '') return;
    const freshText = focus.focus_text;
    if (prevFocusTextRef.current === freshText) return;
    prevFocusTextRef.current = freshText;

    // Don't overwrite if user has pending edits
    if (hasChangesRef.current) return;

    // Check if there's a newer local draft
    const draft = readDraft(profileId);
    if (draft) {
      const dbUpdated = new Date((focus as any).updated_at).getTime();
      const draftUpdated = new Date(draft.updated_at).getTime();
      if (draftUpdated > dbUpdated) return; // local draft is newer, keep it
    }

    if (freshText !== text) {
      setText(freshText);
    }
    if ((focus as any).focus_title !== undefined && (focus as any).focus_title !== title) {
      setTitle((focus as any).focus_title || '');
    }
  }, [focus?.focus_text, profileId]);

  // Deterministic autosize using useLayoutEffect
  useLayoutEffect(() => {
    if (!isOpen) return;
    autosizeTextarea();
    const contentEl = collapsibleContentRef.current;
    const handleAnimationEnd = () => { autosizeTextarea(); };
    if (contentEl) {
      contentEl.addEventListener('transitionend', handleAnimationEnd);
      contentEl.addEventListener('animationend', handleAnimationEnd);
    }
    const fallbackTimeout = setTimeout(() => { autosizeTextarea(); }, 350);
    return () => {
      if (contentEl) {
        contentEl.removeEventListener('transitionend', handleAnimationEnd);
        contentEl.removeEventListener('animationend', handleAnimationEnd);
      }
      clearTimeout(fallbackTimeout);
    };
  }, [isOpen, text, autosizeTextarea]);

  useEffect(() => {
    if (isOpen) {
      const timeoutId = setTimeout(autosizeTextarea, 350);
      return () => clearTimeout(timeoutId);
    }
  }, []);

  useEffect(() => {
    if (isOpen && text) {
      requestAnimationFrame(() => { requestAnimationFrame(() => { autosizeTextarea(); }); });
    }
  }, [text, isOpen, autosizeTextarea]);

  // ResizeObserver
  useEffect(() => {
    if (!isOpen) return;
    const textarea = textareaRef.current;
    if (!textarea) return;
    const observer = new ResizeObserver(() => { autosizeTextarea(); });
    observer.observe(textarea);
    return () => observer.disconnect();
  }, [isOpen, autosizeTextarea]);

  // MutationObserver for Radix CollapsibleContent hidden attribute changes
  useEffect(() => {
    if (!isOpen) return;
    const contentEl = collapsibleContentRef.current;
    if (!contentEl) return;
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'hidden') {
          requestAnimationFrame(() => { autosizeTextarea(); });
        }
      }
    });
    observer.observe(contentEl, { attributes: true, attributeFilter: ['hidden'] });
    return () => observer.disconnect();
  }, [isOpen, autosizeTextarea]);

  // Auto-save with debounce — write draft immediately, DB save on debounce
  const handleTextChange = (value: string) => {
    setText(value);
    setHasChanges(true);

    // Immediately persist draft to localStorage (survives navigation)
    if (profileId) writeDraft(profileId, value);

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await updateFocusAsync(value, titleRef.current);
        setHasChanges(false);
        if (profileId) writeDraft(profileId, value);
      } catch (err) {
        console.warn('[TodaysFocus] DB save failed, draft preserved locally', err);
      }
    }, 1000);
  };

  const handleTitleChange = (value: string) => {
    setTitle(value);
    setHasChanges(true);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await updateFocusAsync(textRef.current, value);
        setHasChanges(false);
      } catch { /* draft preserved */ }
    }, 1000);
  };

  // Save on blur immediately
  const handleBlur = () => {
    if (hasChanges) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      updateFocusAsync(text, title)
        .then(() => setHasChanges(false))
        .catch(() => console.warn('[TodaysFocus] Blur save failed, draft preserved'));
    }
  };

  // Flush pending save on unmount
  const textRef = useRef(text);
  const titleRef = useRef(title);
  const hasChangesRef = useRef(hasChanges);
  textRef.current = text;
  titleRef.current = title;
  hasChangesRef.current = hasChanges;

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (hasChangesRef.current) {
        updateFocus(textRef.current, titleRef.current);
      }
    };
  }, []);

  // Flush pending save immediately when app goes to background
  useEffect(() => {
    const flushPendingSave = () => {
      if (hasChangesRef.current) {
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
          saveTimeoutRef.current = null;
        }
        updateFocus(textRef.current, titleRef.current);
        hasChangesRef.current = false;
      }
    };

    const flushOnBackground = () => {
      if (document.visibilityState === 'hidden') {
        flushPendingSave();
      }
    };

    const handleBeforeSignout = () => {
      flushPendingSave();
    };

    document.addEventListener('visibilitychange', flushOnBackground);
    window.addEventListener('pagehide', flushPendingSave);
    window.addEventListener('noteshare:before-signout', handleBeforeSignout);
    return () => {
      document.removeEventListener('visibilitychange', flushOnBackground);
      window.removeEventListener('pagehide', flushPendingSave);
      window.removeEventListener('noteshare:before-signout', handleBeforeSignout);
    };
  }, [updateFocus]);

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

  // Loading state — only show skeleton if no cached data available (skip in FTUE preview)
  if (isLoading && !focus && !ftuePreview.isFTUEPreview) {
    return (
      <Card className="bg-card border-border min-h-[60px]">
        <div className="px-3 py-4 sm:px-4 flex items-center gap-2">
          <ListTodo className="w-5 h-5 text-muted-foreground" />
           <h2 className="font-semibold">Practice Routine</h2>
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

  const autoSaveCurrentRoutine = () => {
    // Cancel any pending debounced save to prevent it from firing after we switch
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    const currentTitle = titleRef.current.trim();
    const currentText = textRef.current.trim();
    if (currentText && currentTitle) {
      const prevTitle = savedTitleRef.current;
      saveToBacklog(
        { focusText: textRef.current, focusTitle: currentTitle, originalFocusDate: focus?.focus_date, previousTitle: prevTitle !== currentTitle ? prevTitle : undefined },
        { onSuccess: () => { savedTitleRef.current = currentTitle; }, onError: () => toast.error('Failed to save routine') }
      );
    }
  };

  const handleSwitchGuard = (): boolean => {
    if (!isPremium) {
      openPremiumDialog();
      return false;
    }
    if (text.trim() && !title.trim()) {
      toast.error('Title your routine to save before switching');
      return false;
    }
    return true;
  };

  const handleCreateNew = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isPremium) {
      openPremiumDialog();
      return;
    }
    if (text.trim() && !title.trim()) {
      toast.error('Title your routine to save before creating new');
      return;
    }
    // Auto-save current routine if it has content + title
    autoSaveCurrentRoutine();
    // Clear the board
    setTitle('');
    savedTitleRef.current = '';
    setText('');
    setHasChanges(true);
    if (profileId) writeDraft(profileId, '');
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await updateFocusAsync('', '');
        setHasChanges(false);
      } catch { /* draft preserved */ }
    }, 500);
    toast.success('New routine started');
  };

  const handleLoadFromBacklog = (entryTitle: string, entryText: string) => {
    setTitle(entryTitle);
    savedTitleRef.current = entryTitle;
    setText(entryText);
    setHasChanges(true);
    if (profileId) writeDraft(profileId, entryText);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await updateFocusAsync(entryText, entryTitle);
        setHasChanges(false);
      } catch { /* draft preserved */ }
    }, 500);
    toast.success('Practice Routine loaded');
  };

  return (
    <>
      <Card className="bg-card border-border">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          {/* Header row - trigger spans full width with chevron on the right */}
          <CollapsibleTrigger asChild>
            <div className="px-3 py-4 sm:px-4 flex items-center justify-between cursor-pointer group touch-manipulation">
              <div className="flex items-center gap-2">
                <ListTodo className={`w-5 h-5 transition-colors ${isOpen ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`} />
                <h2 className="font-semibold">Practice Routine</h2>
              </div>
              
              <div className="flex items-center gap-1.5">
                <div className={`flex gap-1.5 items-center transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                  <RoutineSwitcherPopover
                    backlogEntries={backlogEntries}
                    isLoading={isBacklogLoading}
                    currentTitle={title}
                    currentText={text}
                    onSelect={handleLoadFromBacklog}
                    onAutoSave={(t, txt) => saveToBacklog({ focusText: txt, focusTitle: t, originalFocusDate: focus?.focus_date })}
                    onDelete={(id) => deleteFromBacklog(id, { onSuccess: () => toast.success('Routine deleted'), onError: () => toast.error('Failed to delete') })}
                    isPremium={isPremium}
                    onUpgrade={openPremiumDialog}
                    onSwitchGuard={handleSwitchGuard}
                    onAutoSaveCurrent={autoSaveCurrentRoutine}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-primary"
                    onClick={handleCreateNew}
                  >
                    New
                  </Button>
                </div>
                
                {/* Chevron - fades out when open so it doesn't compete with action buttons */}
                <ChevronDown className={`w-5 h-5 text-muted-foreground transition-all duration-200 ${isOpen ? 'opacity-0 pointer-events-none rotate-0' : 'opacity-100 -rotate-90'}`} />
              </div>
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent className="px-3 sm:px-4 pb-4" style={{ overflow: 'visible' }}>
            <div ref={collapsibleContentRef}>
              {/* Title input — compact inline */}
              <Input
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                onBlur={handleBlur}
                placeholder="Add routine name"
                className="mb-2 h-8 text-sm font-medium border-none bg-muted/30 focus-visible:ring-1 focus-visible:ring-primary/30 placeholder:text-muted-foreground/50"
              />
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
    </>
  );
}