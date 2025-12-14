import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mic, X, Pencil, Check } from 'lucide-react';
import { AudioFileWithName } from '@/types';
import { WaveformPlayer } from '@/components/WaveformPlayer';

interface AudioFileItemProps {
  audio: AudioFileWithName;
  onRemove: () => void;
  onRename: (newName: string) => void;
}

export function AudioFileItem({ audio, onRemove, onRename }: AudioFileItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(audio.name);

  const handleSave = () => {
    if (editName.trim()) {
      onRename(editName.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditName(audio.name);
      setIsEditing(false);
    }
  };

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-2 p-2 bg-secondary/50 rounded-lg">
      <Mic className="w-4 h-4 text-primary flex-shrink-0" />
      
      {isEditing ? (
        <div className="flex items-center gap-1 flex-1 min-w-0">
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            className="h-7 text-sm"
            autoFocus
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 flex-shrink-0"
            onClick={handleSave}
          >
            <Check className="w-3 h-3" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-1 min-w-0 flex-shrink-0">
          <span className="text-sm font-medium truncate max-w-[120px]">{audio.name}</span>
          {audio.duration && (
            <span className="text-xs text-muted-foreground">({formatDuration(audio.duration)})</span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setIsEditing(true)}
          >
            <Pencil className="w-3 h-3" />
          </Button>
        </div>
      )}
      
      <div className="flex-1 min-w-0">
        <WaveformPlayer src={audio.url} title={audio.name} />
      </div>
      
      <Button
        variant="ghost"
        size="icon"
        className="flex-shrink-0"
        onClick={onRemove}
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}