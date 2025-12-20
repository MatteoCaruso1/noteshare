import { useRef, useCallback, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { List, ListOrdered, Bold, Underline } from 'lucide-react';
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
  rows = 2,
  className,
  showToolbar = true,
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

  const wrapSelection = useCallback((wrapper: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);
    
    if (start === end) {
      // No selection - insert wrapper markers and place cursor between
      const newValue = value.substring(0, start) + wrapper + wrapper + value.substring(end);
      onChange(newValue);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + wrapper.length;
        textarea.focus();
      }, 0);
    } else {
      // Check if already wrapped
      const beforeStart = value.substring(start - wrapper.length, start);
      const afterEnd = value.substring(end, end + wrapper.length);
      
      if (beforeStart === wrapper && afterEnd === wrapper) {
        // Remove wrapping
        const newValue = value.substring(0, start - wrapper.length) + selectedText + value.substring(end + wrapper.length);
        onChange(newValue);
        setTimeout(() => {
          textarea.selectionStart = start - wrapper.length;
          textarea.selectionEnd = end - wrapper.length;
          textarea.focus();
        }, 0);
      } else {
        // Add wrapping
        const newValue = value.substring(0, start) + wrapper + selectedText + wrapper + value.substring(end);
        onChange(newValue);
        setTimeout(() => {
          textarea.selectionStart = start + wrapper.length;
          textarea.selectionEnd = end + wrapper.length;
          textarea.focus();
        }, 0);
      }
    }
  }, [value, onChange]);

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
    let newCursorOffset: number;
    
    if (prefix === '• ') {
      if (bulletMatch) {
        // Remove bullet
        newLine = line.replace(/^(\s*)[-•]\s/, '$1');
        newCursorOffset = -bulletMatch[2].length;
      } else if (numberMatch) {
        // Replace number with bullet
        newLine = line.replace(/^(\s*)\d+\.\s/, '$1• ');
        newCursorOffset = '• '.length - numberMatch[2].length;
      } else {
        // Add bullet
        newLine = '• ' + line;
        newCursorOffset = 2;
      }
    } else {
      // Numbered list
      if (numberMatch) {
        // Remove number
        newLine = line.replace(/^(\s*)\d+\.\s/, '$1');
        newCursorOffset = -numberMatch[2].length;
      } else if (bulletMatch) {
        // Replace bullet with number
        newLine = line.replace(/^(\s*)[-•]\s/, '$11. ');
        newCursorOffset = '1. '.length - bulletMatch[2].length;
      } else {
        // Add number
        newLine = '1. ' + line;
        newCursorOffset = 3;
      }
    }
    
    const newValue = value.substring(0, lineStart) + newLine + value.substring(lineEnd);
    onChange(newValue);
    
    // Position cursor at the end of the line (after the content)
    setTimeout(() => {
      const newCursorPos = lineStart + newLine.length;
      textarea.selectionStart = textarea.selectionEnd = newCursorPos;
      textarea.focus();
    }, 0);
  }, [value, onChange, getLineInfo]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = e.target as HTMLTextAreaElement;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    // Bold: Ctrl/Cmd + B
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
      e.preventDefault();
      wrapSelection('**');
      return;
    }
    
    // Underline: Ctrl/Cmd + U
    if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
      e.preventDefault();
      wrapSelection('__');
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
          const newValue = value.substring(0, lineStart) + line.substring(indent.length) + value.substring(info.lineEnd);
          onChange(newValue);
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = Math.max(lineStart, start - indent.length);
          }, 0);
        }
      } else {
        // Indent: add spaces at line start
        const newValue = value.substring(0, lineStart) + indent + value.substring(lineStart);
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
        
        const newValue = value.substring(0, start) + '\n' + prefix + value.substring(end);
        onChange(newValue);
        
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 1 + prefix.length;
        }, 0);
      }
    }
  }, [value, onChange, getLineInfo, wrapSelection]);

  return (
    <div className="space-y-1">
      {showToolbar && (
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
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => wrapSelection('**')}
            title="Bold (Ctrl+B)"
          >
            <Bold className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => wrapSelection('__')}
            title="Underline (Ctrl+U)"
          >
            <Underline className="w-4 h-4" />
          </Button>
        </div>
      )}
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={rows}
        className={cn("resize-none text-sm", className)}
      />
    </div>
  );
}
