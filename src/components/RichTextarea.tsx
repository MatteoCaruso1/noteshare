import { useRef, useCallback, useEffect, useMemo } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

// Tips shown occasionally as placeholders
const PLACEHOLDER_TIPS = [
  'Tip: Type [ ] to create checkable practice items',
  'Tip: Type - to create bulleted lists',
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

  // Auto-expand textarea as content grows
  useEffect(() => {
    if (autoExpand && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const minHeight = rows * 24; // Approximate line height
      textareaRef.current.style.height = `${Math.max(minHeight, textareaRef.current.scrollHeight)}px`;
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

  // Auto-capitalize the first letter after a list prefix
  const autoCapitalizeAfterPrefix = useCallback((text: string, cursorPos: number): { text: string; newCursorPos: number } => {
    const lines = text.split('\n');
    let pos = 0;
    let modified = false;
    
    const newLines = lines.map(line => {
      const lineStart = pos;
      const lineEnd = pos + line.length;
      pos = lineEnd + 1; // +1 for the newline
      
      // Check if cursor is on this line and just after a list prefix
      if (cursorPos >= lineStart && cursorPos <= lineEnd) {
        // Match bullet or number followed by a single lowercase letter
        const bulletCapMatch = line.match(/^(\s*[-•]\s)([a-z])(.*)$/);
        const numberCapMatch = line.match(/^(\s*\d+\.\s)([a-z])(.*)$/);
        
        if (bulletCapMatch) {
          modified = true;
          return bulletCapMatch[1] + bulletCapMatch[2].toUpperCase() + bulletCapMatch[3];
        }
        if (numberCapMatch) {
          modified = true;
          return numberCapMatch[1] + numberCapMatch[2].toUpperCase() + numberCapMatch[3];
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
    
    // Auto-convert "[]" or "[ ]" at line start to checkbox
    if (lineBeforeCursor === '[] ' || lineBeforeCursor === '[ ] ' || lineBeforeCursor.match(/^\s+\[\s?\]\s$/)) {
      const indent = lineBeforeCursor.match(/^(\s*)/)?.[1] || '';
      const transformed = newValue.substring(0, lineStart) + indent + '☐ ' + newValue.substring(cursorPos);
      const newCursor = lineStart + indent.length + 2;
      
      onChange(transformed);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = newCursor;
      }, 0);
      return;
    }
    
    // Auto-convert "- " at line start to bullet
    if (lineBeforeCursor === '- ' || lineBeforeCursor.match(/^\s+- $/)) {
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

  // Check if a position is over a checkbox
  const isOverCheckbox = useCallback((textarea: HTMLTextAreaElement, cursorPos: number): boolean => {
    const text = textarea.value;
    
    // Find line start
    let lineStart = cursorPos;
    while (lineStart > 0 && text[lineStart - 1] !== '\n') {
      lineStart--;
    }
    
    // Get the line content
    let lineEnd = cursorPos;
    while (lineEnd < text.length && text[lineEnd] !== '\n') {
      lineEnd++;
    }
    const line = text.substring(lineStart, lineEnd);
    
    // Check if line starts with a checkbox
    const checkboxMatch = line.match(/^(\s*)(☐|☑)\s/);
    if (!checkboxMatch) return false;
    
    const indent = checkboxMatch[1];
    const checkboxPosInLine = indent.length;
    const clickPosInLine = cursorPos - lineStart;
    
    // Check if cursor is on or near the checkbox
    return clickPosInLine <= checkboxPosInLine + 2;
  }, []);

  // Track mouse position for hover feedback
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLTextAreaElement>) => {
    const textarea = e.target as HTMLTextAreaElement;
    
    // Get approximate character position from click coordinates
    // This is a rough approximation - we use the selection API after a synthetic focus
    const rect = textarea.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Check if we're in the left portion where checkboxes would be (first ~30px)
    if (x < 40) {
      // Check if any line has a checkbox
      const lines = textarea.value.split('\n');
      const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 24;
      const paddingTop = parseInt(getComputedStyle(textarea).paddingTop) || 8;
      const scrollTop = textarea.scrollTop;
      
      const lineIndex = Math.floor((y + scrollTop - paddingTop) / lineHeight);
      if (lineIndex >= 0 && lineIndex < lines.length) {
        const line = lines[lineIndex];
        if (line.match(/^(\s*)(☐|☑)\s/)) {
          textarea.style.cursor = 'pointer';
          return;
        }
      }
    }
    
    textarea.style.cursor = 'text';
  }, []);

  const handleMouseLeave = useCallback((e: React.MouseEvent<HTMLTextAreaElement>) => {
    (e.target as HTMLTextAreaElement).style.cursor = 'text';
  }, []);

  // Handle clicks on checkbox characters to toggle them
  const handleClick = useCallback((e: React.MouseEvent<HTMLTextAreaElement>) => {
    const textarea = e.target as HTMLTextAreaElement;
    const cursorPos = textarea.selectionStart;
    const text = textarea.value;
    
    // Find line start
    let lineStart = cursorPos;
    while (lineStart > 0 && text[lineStart - 1] !== '\n') {
      lineStart--;
    }
    
    // Get the line content
    let lineEnd = cursorPos;
    while (lineEnd < text.length && text[lineEnd] !== '\n') {
      lineEnd++;
    }
    const line = text.substring(lineStart, lineEnd);
    
    // Check if line starts with a checkbox (with optional leading whitespace)
    const checkboxMatch = line.match(/^(\s*)(☐|☑)\s/);
    if (!checkboxMatch) return;
    
    const indent = checkboxMatch[1];
    const checkboxChar = checkboxMatch[2];
    const checkboxPosInLine = indent.length;
    const clickPosInLine = cursorPos - lineStart;
    
    // Only toggle if clicked on or near the checkbox (within 2 characters)
    if (clickPosInLine <= checkboxPosInLine + 2) {
      const newCheckbox = checkboxChar === '☐' ? '☑' : '☐';
      const newLine = indent + newCheckbox + line.substring(checkboxPosInLine + 1);
      const newValue = text.substring(0, lineStart) + newLine + text.substring(lineEnd);
      
      onChange(newValue);
      
      // Keep cursor position
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = cursorPos;
      }, 0);
    }
  }, [onChange]);

  return (
    <div className="space-y-1">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        placeholder={displayPlaceholder}
        rows={rows}
        className={cn("practice-board-textarea resize-none text-sm min-h-[36px]", className)}
      />
    </div>
  );
}
