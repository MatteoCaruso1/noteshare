import { useState, useRef, useEffect } from 'react';
import { RichTextarea } from '@/components/RichTextarea';
import { cn } from '@/lib/utils';

interface InlineEditableDescriptionProps {
  value: string;
  onSave: (newValue: string) => void;
  canEdit: boolean;
  placeholder?: string;
  className?: string;
}

export function InlineEditableDescription({
  value,
  onSave,
  canEdit,
  placeholder = 'Add a description...',
  className,
}: InlineEditableDescriptionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync when value changes externally
  useEffect(() => {
    if (!isEditing) {
      setEditValue(value);
    }
  }, [value, isEditing]);

  const handleClick = () => {
    if (!canEdit || isEditing) return;
    setEditValue(value);
    setIsEditing(true);
  };

  const handleBlur = () => {
    setIsEditing(false);
    const trimmed = editValue.trim();
    if (trimmed !== value.trim()) {
      onSave(trimmed);
    }
  };

  if (isEditing) {
    return (
      <div ref={containerRef} className={cn('p-4 bg-card rounded-lg border border-primary/30', className)}>
        <RichTextarea
          value={editValue}
          onChange={setEditValue}
          rows={3}
          autoExpand
          placeholder={placeholder}
          className="text-sm border-0 p-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent"
        />
        <div className="flex justify-end mt-2 gap-2">
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground"
            onMouseDown={(e) => {
              e.preventDefault();
              setEditValue(value);
              setIsEditing(false);
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            className="text-xs text-primary font-medium hover:text-primary/80"
            onMouseDown={(e) => {
              e.preventDefault();
              handleBlur();
            }}
          >
            Save
          </button>
        </div>
      </div>
    );
  }

  // Read-only display (clickable if canEdit)
  if (!value && !canEdit) return null;

  return (
    <div
      onClick={handleClick}
      className={cn(
        'p-4 bg-card rounded-lg border border-border',
        canEdit && 'cursor-pointer hover:border-primary/20 transition-colors',
        className,
      )}
    >
      {value ? (
        <p className="text-sm text-muted-foreground whitespace-pre-line">{value}</p>
      ) : (
        canEdit && (
          <p className="text-sm text-muted-foreground/50 italic">{placeholder}</p>
        )
      )}
    </div>
  );
}
