import { useRef, useCallback, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface RichTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  showToolbar?: boolean;
  autoExpand?: boolean;
}

export function RichTextarea({
  value,
  onChange,
  placeholder,
  rows = 1,
  className,
  showToolbar = false, // Toolbar now hidden by default
  autoExpand = true,
}: RichTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
    
    return lines.map(line => {
      // Match numbered list item - content after space is optional
      const numberMatch = line.match(/^(\s*)(\d+)\.\s?(.*)$/);
      if (numberMatch) {
        const indent = numberMatch[1];
        const content = numberMatch[3];
        if (!inNumberedList || indent === '') {
          currentNumber = 1;
          inNumberedList = true;
        } else {
          currentNumber++;
        }
        // Always include space after number, even if content is empty
        return `${indent}${currentNumber}. ${content}`;
      } else {
        // Reset numbering when we exit the list (non-empty, non-whitespace line that isn't a list)
        const isBullet = line.match(/^(\s*)[-•]\s/);
        if (!line.match(/^\s*$/) && !isBullet) {
          inNumberedList = false;
          currentNumber = 0;
        }
        return line;
      }
    }).join('\n');
  }, []);

  const insertListPrefix = useCallback((prefix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
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
    
    let newValue = value.substring(0, lineStart) + newLine + value.substring(lineEnd);
    
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
  }, [value, onChange, getLineInfo, renumberList]);

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
          let newValue = value.substring(0, lineStart) + line.substring(indent.length) + value.substring(info.lineEnd);
          newValue = renumberList(newValue);
          onChange(newValue);
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = Math.max(lineStart, start - indent.length);
          }, 0);
        }
      } else {
        // Indent: add spaces at line start
        let newValue = value.substring(0, lineStart) + indent + value.substring(lineStart);
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
      
      const { line } = info;
      
      // Check for list patterns
      const bulletMatch = line.match(/^(\s*)([-•])\s/);
      const numberMatch = line.match(/^(\s*)(\d+)\.\s/);
      
      if (bulletMatch || numberMatch) {
        // Check if line is empty (just the prefix)
        const contentAfterPrefix = bulletMatch 
          ? line.replace(/^(\s*)[-•]\s/, '')
          : line.replace(/^(\s*)\d+\.\s/, '');
        
        if (contentAfterPrefix.trim() === '') {
          // Empty list item - end the list
          e.preventDefault();
          const info = getLineInfo();
          if (info) {
            const newValue = value.substring(0, info.lineStart) + '\n' + value.substring(info.lineEnd);
            onChange(newValue);
            setTimeout(() => {
              textarea.selectionStart = textarea.selectionEnd = info.lineStart + 1;
            }, 0);
          }
          return;
        }
        
        e.preventDefault();
        
        // Continue list on new line
        const indent = bulletMatch ? bulletMatch[1] : numberMatch![1];
        let prefix: string;
        
        if (bulletMatch) {
          prefix = indent + bulletMatch[2] + ' ';
        } else {
          const num = parseInt(numberMatch![2]) + 1;
          prefix = indent + num + '. ';
        }
        
        let newValue = value.substring(0, start) + '\n' + prefix + value.substring(end);
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
  }, [value, onChange, getLineInfo, insertListPrefix, renumberList]);

  return (
    <div className="space-y-1">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={rows}
        className={cn("resize-none text-sm min-h-[36px]", className)}
      />
    </div>
  );
}
