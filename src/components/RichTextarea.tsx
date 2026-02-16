import { useRef, useCallback, useEffect, useMemo } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useCheckboxToggle } from '@/hooks/useCheckboxToggle';
import { focusWithoutScroll, getScrollContainerFor, getScrollTop, restoreScrollNextFrame } from '@/lib/preserveScroll';

// Tips shown occasionally as placeholders
const PLACEHOLDER_TIPS = [
  'Tip: Type [] for checkboxes',
  'Tip: Type - for bullets',
];

// Get a random tip with 1/7 probability
function getPlaceholderWithTip(defaultPlaceholder: string): string {
  if (Math.random() < 1 / 7) {
    return PLACEHOLDER_TIPS[Math.floor(Math.random() * PLACEHOLDER_TIPS.length)];
  }
  return defaultPlaceholder;
}

interface RichTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  showToolbar?: boolean;
  autoExpand?: boolean;
  showTips?: boolean;
}

export function RichTextarea({
  value,
  onChange,
  placeholder,
  rows = 1,
  className,
  showToolbar = false, // Toolbar now hidden by default
  autoExpand = true,
  showTips = false,
}: RichTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Memoize placeholder with tip to avoid changing on every render
  const displayPlaceholder = useMemo(() => {
    if (showTips && placeholder) {
      return getPlaceholderWithTip(placeholder);
    }
    return placeholder;
  }, [placeholder, showTips]);

  // Auto-expand textarea as content grows (without causing scroll jumps)
  useEffect(() => {
    if (autoExpand && textareaRef.current) {
      const textarea = textareaRef.current;
      const minHeight = rows * 24; // Approximate line height
      
      // Save scroll positions before measuring
      const savedWindowScroll = window.scrollY;
      const scrollParent = textarea.closest('[data-radix-scroll-area-viewport]') as HTMLElement | null;
      const savedParentScroll = scrollParent ? scrollParent.scrollTop : 0;
      
      // Temporarily hide overflow to prevent browser from auto-scrolling during measurement
      const prevOverflow = textarea.style.overflow;
      textarea.style.overflow = 'hidden';
      
      // Measure
      textarea.style.height = 'auto';
      const newHeight = Math.max(minHeight, textarea.scrollHeight);
      textarea.style.height = `${newHeight}px`;
      
      // Restore overflow
      textarea.style.overflow = prevOverflow;
      
      // Immediately restore scroll positions (synchronously, no rAF delay)
      if (window.scrollY !== savedWindowScroll) {
        window.scrollTo({ top: savedWindowScroll, behavior: 'auto' });
      }
      if (scrollParent && scrollParent.scrollTop !== savedParentScroll) {
        scrollParent.scrollTop = savedParentScroll;
      }
    }
  }, [value, autoExpand, rows]);

  const getLineInfo = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return null;
    
    const start = textarea.selectionStart;
    const text = textarea.value;
    
    // Find line start
    let lineStart = start;
    while (lineStart > 0 && text[lineStart - 1] !== '\n') {
      lineStart--;
    }
    
    // Find line end
    let lineEnd = start;
    while (lineEnd < text.length && text[lineEnd] !== '\n') {
      lineEnd++;
    }
    
    const line = text.substring(lineStart, lineEnd);
    return { lineStart, lineEnd, line, cursorPos: start };
  }, []);

  // Renumber all items in a numbered list
  const renumberList = useCallback((text: string): string => {
    const lines = text.split('\n');
    let currentNumber = 0;
    let inNumberedList = false;
    let lastIndent = '';

    return lines
      .map((line) => {
        // Match numbered list item - content after space is optional
        const numberMatch = line.match(/^(\s*)(\d+)\.\s?(.*)$/);

        if (numberMatch) {
          const indent = numberMatch[1];
          const content = numberMatch[3];

          // Start (or restart) numbering when entering a list OR when indentation level changes
          if (!inNumberedList || indent !== lastIndent) {
            inNumberedList = true;
            currentNumber = 1;
            lastIndent = indent;
          } else {
            currentNumber++;
          }

          return `${indent}${currentNumber}. ${content}`;
        }

        // Reset numbering when we exit the list (non-empty, non-whitespace line that isn't a list)
        const isBullet = line.match(/^(\s*)[-•]\s/);
        if (!line.match(/^\s*$/) && !isBullet) {
          inNumberedList = false;
          currentNumber = 0;
          lastIndent = '';
        }

        return line;
      })
      .join('\n');
  }, []);

  const insertListPrefix = useCallback((prefix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const currentValue = textarea.value;

    const info = getLineInfo();
    if (!info) return;

    const { lineStart, lineEnd, line } = info;

    // Check if line already has a list prefix
    const bulletMatch = line.match(/^(\s*)([-•]\s)/);
    const numberMatch = line.match(/^(\s*)(\d+\.\s)/);

    let newLine: string;

    if (prefix === '• ') {
      if (bulletMatch) {
        // Remove bullet
        newLine = line.replace(/^(\s*)[-•]\s/, '$1');
      } else if (numberMatch) {
        // Replace number with bullet
        newLine = line.replace(/^(\s*)\d+\.\s/, '$1• ');
      } else {
        // Add bullet
        newLine = '• ' + line;
      }
    } else {
      // Numbered list
      if (numberMatch) {
        // Remove number
        newLine = line.replace(/^(\s*)\d+\.\s/, '$1');
      } else if (bulletMatch) {
        // Replace bullet with number
        newLine = line.replace(/^(\s*)[-•]\s/, '$11. ');
      } else {
        // Add number
        newLine = '1. ' + line;
      }
    }

    let newValue = currentValue.substring(0, lineStart) + newLine + currentValue.substring(lineEnd);

    // Renumber if it's a numbered list
    if (prefix !== '• ') {
      newValue = renumberList(newValue);
    }

    onChange(newValue);

    // Position cursor at the end of the line (after the content)
    setTimeout(() => {
      const newCursorPos = lineStart + newLine.length;
      textarea.selectionStart = textarea.selectionEnd = newCursorPos;
      textarea.focus();
    }, 0);
  }, [onChange, getLineInfo, renumberList]);

  // Auto-capitalize the first letter after a list prefix (bullet, number, or checkbox)
  const autoCapitalizeAfterPrefix = useCallback((text: string, cursorPos: number): { text: string; newCursorPos: number } => {
    const lines = text.split('\n');
    let pos = 0;
    let modified = false;
    
    const newLines = lines.map(line => {
      const lineStart = pos;
      const lineEnd = pos + line.length;
      pos = lineEnd + 1; // +1 for the newline
      
      // Check if cursor is on this line
      if (cursorPos >= lineStart && cursorPos <= lineEnd) {
        // The cursor position relative to line start
        const relativeCursor = cursorPos - lineStart;
        
        // Match bullet, number, or checkbox followed by text starting with a lowercase letter
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
            return match[1] + match[2].toUpperCase() + match[3];
          }
        }
      }
      return line;
    });
    
    return { text: modified ? newLines.join('\n') : text, newCursorPos: cursorPos };
  }, []);

  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    const newValue = textarea.value;
    const cursorPos = textarea.selectionStart;
    
    // Find current line info
    let lineStart = cursorPos;
    while (lineStart > 0 && newValue[lineStart - 1] !== '\n') {
      lineStart--;
    }
    const lineBeforeCursor = newValue.substring(lineStart, cursorPos);
    
    // Auto-convert "[]" or "[ ]" at line start to checkbox (no trailing space required)
    if (lineBeforeCursor === '[]' || lineBeforeCursor === '[ ]' || lineBeforeCursor.match(/^\s+\[\s?\]$/)) {
      const scrollContainer = getScrollContainerFor(textarea);
      const savedScrollTop = getScrollTop(scrollContainer);

      const indent = lineBeforeCursor.match(/^(\s*)/)?.[1] || '';
      const transformed = newValue.substring(0, lineStart) + indent + '☐ ' + newValue.substring(cursorPos);
      const newCursor = lineStart + indent.length + 2;
      
      onChange(transformed);
      setTimeout(() => {
        // Keep selection stable and prevent the browser from auto-scrolling to the caret
        focusWithoutScroll(textarea);
        textarea.setSelectionRange(newCursor, newCursor);
        restoreScrollNextFrame(scrollContainer, savedScrollTop);
      }, 0);
      return;
    }
    
    // Auto-convert "-" at line start to bullet (no space required)
    if (lineBeforeCursor === '-' || lineBeforeCursor.match(/^\s+-$/)) {
      const indent = lineBeforeCursor.match(/^(\s*)/)?.[1] || '';
      const transformed = newValue.substring(0, lineStart) + indent + '• ' + newValue.substring(cursorPos);
      const newCursor = lineStart + indent.length + 2;
      
      onChange(transformed);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = newCursor;
      }, 0);
      return;
    }
    
    // Mobile shortcut: ".- " creates a bullet
    if (lineBeforeCursor === '.- ' || lineBeforeCursor === '. - ') {
      const transformed = newValue.substring(0, lineStart) + '• ' + newValue.substring(cursorPos);
      const newCursor = lineStart + 2;
      
      onChange(transformed);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = newCursor;
      }, 0);
      return;
    }
    
    // Auto-capitalize first letter after list prefix (only if just typed a lowercase letter after prefix)
    const { text: capitalizedText, newCursorPos } = autoCapitalizeAfterPrefix(newValue, cursorPos);
    
    if (capitalizedText !== newValue) {
      onChange(capitalizedText);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = newCursorPos;
      }, 0);
      return;
    }
    
    // Otherwise, just pass through the value unchanged (preserves undo history)
    onChange(newValue);
  }, [onChange, autoCapitalizeAfterPrefix]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = e.target as HTMLTextAreaElement;
    const currentValue = textarea.value;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    // Allow native undo/redo (Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z)
    if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'y')) {
      return; // Let the browser handle undo/redo natively
    }

    // Ctrl+Shift+L or Cmd+Shift+L for bullet list
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'l') {
      e.preventDefault();
      insertListPrefix('• ');
      return;
    }

    // Ctrl+Shift+O or Cmd+Shift+O for numbered list
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'o') {
      e.preventDefault();
      insertListPrefix('1. ');
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();

      // Find current line
      const info = getLineInfo();
      if (!info) return;

      const { lineStart, line } = info;
      const indent = '  ';

      if (e.shiftKey) {
        // Un-indent: remove leading spaces
        if (line.startsWith(indent)) {
          let newValue = currentValue.substring(0, lineStart) + line.substring(indent.length) + currentValue.substring(info.lineEnd);
          newValue = renumberList(newValue);
          onChange(newValue);
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = Math.max(lineStart, start - indent.length);
          }, 0);
        }
      } else {
        // Indent: add spaces at line start
        let newValue = currentValue.substring(0, lineStart) + indent + currentValue.substring(lineStart);
        newValue = renumberList(newValue);
        onChange(newValue);
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + indent.length;
        }, 0);
      }
      return;
    }

    if (e.key === 'Enter') {
      const info = getLineInfo();
      if (!info) return;

      const { line, lineStart, lineEnd } = info;

      // Check for list patterns
      const bulletMatch = line.match(/^(\s*)([-•])\s/);
      const numberMatch = line.match(/^(\s*)(\d+)\.\s/);
      const checkboxMatch = line.match(/^(\s*)(☐|☑)\s/);

      if (bulletMatch || numberMatch || checkboxMatch) {
        // Check if line is empty (just the prefix)
        let contentAfterPrefix: string;
        if (bulletMatch) {
          contentAfterPrefix = line.replace(/^(\s*)[-•]\s/, '');
        } else if (numberMatch) {
          contentAfterPrefix = line.replace(/^(\s*)\d+\.\s/, '');
        } else {
          contentAfterPrefix = line.replace(/^(\s*)[☐☑]\s/, '');
        }

        if (contentAfterPrefix.trim() === '') {
          // Empty list item - end the list
          e.preventDefault();
          const newValue = currentValue.substring(0, lineStart) + '\n' + currentValue.substring(lineEnd);
          onChange(newValue);
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = lineStart + 1;
          }, 0);
          return;
        }

        e.preventDefault();

        // Continue list on new line
        let indent: string;
        let prefix: string;

        if (bulletMatch) {
          indent = bulletMatch[1];
          prefix = indent + bulletMatch[2] + ' ';
        } else if (numberMatch) {
          indent = numberMatch[1];
          const num = parseInt(numberMatch[2], 10) + 1;
          prefix = indent + num + '. ';
        } else {
          // Checkbox - always add unchecked box for new items
          indent = checkboxMatch![1];
          prefix = indent + '☐ ';
        }

        let newValue = currentValue.substring(0, start) + '\n' + prefix + currentValue.substring(end);
        // Renumber if it's a numbered list
        if (numberMatch) {
          newValue = renumberList(newValue);
        }
        onChange(newValue);

        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 1 + prefix.length;
        }, 0);
      }
    }
  }, [onChange, getLineInfo, insertListPrefix, renumberList]);

  // Checkbox toggle with haptic feedback and protection
  const performCheckboxToggle = useCallback((lineIndex: number, isNowChecked: boolean) => {
    const lines = value.split('\n');
    if (lineIndex < 0 || lineIndex >= lines.length) return;
    
    const line = lines[lineIndex];
    const checkboxMatch = line.match(/^(\s*)(☐|☑)\s/);
    if (!checkboxMatch) return;
    
    const indent = checkboxMatch[1];
    const newCheckbox = isNowChecked ? '☑' : '☐';
    const newLine = indent + newCheckbox + line.substring(indent.length + 1);
    
    lines[lineIndex] = newLine;
    onChange(lines.join('\n'));
  }, [value, onChange]);

  const { 
    toggleCheckbox, 
    getLineIndexFromY, 
    isInCheckboxZone, 
    isOnCheckbox 
  } = useCheckboxToggle({
    onToggle: performCheckboxToggle,
    getText: () => value,
    requireDoubleToUncheck: false, // Single tap for both check and uncheck - better mobile UX
  });

  // Handle touch end for mobile checkbox toggling
  const handleTouchEnd = useCallback((e: React.TouchEvent<HTMLTextAreaElement>) => {
    const textarea = e.target as HTMLTextAreaElement;
    const touch = e.changedTouches[0];
    if (!touch) return;
    
    const lineIndex = getLineIndexFromY(textarea, touch.clientY);
    const lines = value.split('\n');
    
    if (lineIndex >= 0 && lineIndex < lines.length) {
      const line = lines[lineIndex];
      const checkboxMatch = line.match(/^(\s*)(☐|☑)\s/);
      
      if (checkboxMatch) {
        const isChecked = checkboxMatch[2] === '☑';
        
        // Check if touch is in the checkbox zone
        // Use wider zone for checked boxes to bias towards unchecking
        if (!isInCheckboxZone(textarea, touch.clientX, isChecked)) return;
        
        // Prevent the default behavior that would move the cursor
        e.preventDefault();

        // Preserve page scroll so toggling a checkbox never repositions the viewport on mobile
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
  }, [value, toggleCheckbox, getLineIndexFromY, isInCheckboxZone]);

  // Handle clicks on checkbox characters to toggle them (desktop)
  const handleClick = useCallback((e: React.MouseEvent<HTMLTextAreaElement>) => {
    const textarea = e.target as HTMLTextAreaElement;
    const cursorPos = textarea.selectionStart;
    
    const { isCheckbox, lineIndex } = isOnCheckbox(value, cursorPos);
    
    if (isCheckbox && lineIndex !== -1) {
      const scrollContainer = getScrollContainerFor(textarea);
      const savedScrollTop = getScrollTop(scrollContainer);

      toggleCheckbox(lineIndex);
      
      // Keep cursor position
      setTimeout(() => {
        focusWithoutScroll(textarea);
        textarea.setSelectionRange(cursorPos, cursorPos);
        restoreScrollNextFrame(scrollContainer, savedScrollTop);
      }, 0);
    }
  }, [value, toggleCheckbox, isOnCheckbox]);

  // Track mouse position for hover feedback on checkboxes
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLTextAreaElement>) => {
    const textarea = e.target as HTMLTextAreaElement;
    
    if (isInCheckboxZone(textarea, e.clientX)) {
      const lineIndex = getLineIndexFromY(textarea, e.clientY);
      const lines = value.split('\n');
      
      if (lineIndex >= 0 && lineIndex < lines.length) {
        const line = lines[lineIndex];
        if (line.match(/^(\s*)(☐|☑)\s/)) {
          textarea.style.cursor = 'pointer';
          return;
        }
      }
    }
    textarea.style.cursor = 'text';
  }, [value, isInCheckboxZone, getLineIndexFromY]);

  const handleMouseLeave = useCallback((e: React.MouseEvent<HTMLTextAreaElement>) => {
    (e.target as HTMLTextAreaElement).style.cursor = 'text';
  }, []);

  return (
    <div className="space-y-1">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        onClick={handleClick}
        onTouchEnd={handleTouchEnd}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        placeholder={displayPlaceholder}
        rows={rows}
        className={cn("practice-board-textarea resize-none text-sm !min-h-[40px]", className)}
      />
    </div>
  );
}
