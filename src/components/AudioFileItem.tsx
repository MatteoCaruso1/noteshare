import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Trash2, Pencil, Check, Loader2, Upload, CheckCircle, Users, Lock } from 'lucide-react';
import { AudioFileWithName } from '@/types';
import { WaveformPlayer } from '@/components/WaveformPlayer';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface AudioFileItemProps {
  audio: AudioFileWithName;
  onRemove: () => void;
  onRename: (newName: string) => void;
  uploadProgress?: number;
  isUploading?: boolean;
  uploadComplete?: boolean;
  isPrivate?: boolean;
  onTogglePrivacy?: () => void;
}

export function AudioFileItem({ 
  audio, 
  onRemove, 
  onRename, 
  uploadProgress,
  isUploading,
  uploadComplete,
  isPrivate,
  onTogglePrivacy,
}: AudioFileItemProps) {
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
    <div className="flex flex-col gap-1.5 px-2.5 py-2 bg-secondary/30 rounded-lg border border-border/50">
      {/* Header row: icon, name, actions */}
      <div className="flex items-center gap-1.5">
        {isUploading ? (
          <Loader2 className="w-4 h-4 text-primary flex-shrink-0 animate-spin" />
        ) : uploadComplete ? (
          <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
        ) : null}
        
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
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-sm font-medium truncate">{audio.name}</span>
            {audio.duration && (
              <span className="text-xs text-muted-foreground flex-shrink-0">
                {formatDuration(audio.duration)}
              </span>
            )}
            {isUploading && uploadProgress !== undefined && (
              <span className="text-xs text-primary flex-shrink-0">
                {Math.round(uploadProgress)}%
              </span>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 flex-shrink-0"
              onClick={() => setIsEditing(true)}
              disabled={isUploading}
            >
              <Pencil className="w-3 h-3" />
            </Button>
          </div>
        )}

        {/* Privacy toggle */}
        {onTogglePrivacy && (
          <div
            className="flex items-center gap-1 flex-shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <Users className={`w-3.5 h-3.5 ${!isPrivate ? 'text-primary' : 'text-muted-foreground/50'}`} />
            <Switch
              checked={!!isPrivate}
              onCheckedChange={() => onTogglePrivacy()}
              className="h-5 w-9 data-[state=checked]:bg-muted-foreground data-[state=unchecked]:bg-primary/80"
              disabled={isUploading}
            />
            <Lock className={`w-3.5 h-3.5 ${isPrivate ? 'text-foreground' : 'text-muted-foreground/50'}`} />
          </div>
        )}

        <div className="w-1.5 flex-shrink-0" />
        
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 flex-shrink-0 text-muted-foreground hover:text-foreground hover:bg-transparent"
              disabled={isUploading}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="max-w-xs">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete recording?</AlertDialogTitle>
              <AlertDialogDescription>This can't be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onRemove}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      
      {/* Upload progress bar */}
      {isUploading && uploadProgress !== undefined && (
        <div className="space-y-1">
          <Progress value={uploadProgress} className="h-1.5" />
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Upload className="w-3 h-3" />
            Uploading...
          </p>
        </div>
      )}
      
      {/* Waveform player row - only show when not uploading */}
      {!isUploading && (
        <div>
          <WaveformPlayer src={audio.url} title={audio.name} />
        </div>
      )}
    </div>
  );
}