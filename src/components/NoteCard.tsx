import { NoteWithAuthor } from '@/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Mic, User, Disc3, Lock, Globe, Clock, FileText, Trash2, Users } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useUpdateNoteVisibility } from '@/hooks/useUpdateNote';
import { useDeleteNote } from '@/hooks/useNotes';
import { useAuth } from '@/hooks/useAuth';

interface NoteCardProps {
  note: NoteWithAuthor;
  expanded?: boolean;
}

export function NoteCard({ note, expanded }: NoteCardProps) {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const updateVisibility = useUpdateNoteVisibility();
  const deleteNote = useDeleteNote();

  const isOwner = profile?.id === note.author_id;
  const isPracticeSession = !!note.session_id;

  const handleVisibilityChange = (value: string) => {
    updateVisibility.mutate({
      noteId: note.id,
      visibility: value as 'private' | 'friends' | 'public',
    });
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this note?')) {
      deleteNote.mutate(note.id);
    }
  };

  const getVisibilityIcon = () => {
    switch (note.visibility) {
      case 'private':
        return <Lock className="w-3 h-3 text-muted-foreground" />;
      case 'friends':
        return <Users className="w-3 h-3 text-primary" />;
      case 'public':
        return <Globe className="w-3 h-3 text-muted-foreground" />;
      default:
        return <Lock className="w-3 h-3 text-muted-foreground" />;
    }
  };

  return (
    <Card
      className={`p-4 bg-card border-border ${!expanded ? 'cursor-pointer hover:border-primary/50' : ''} transition-colors`}
      onClick={!expanded ? () => navigate(`/notes/${note.id}`) : undefined}
    >
      {/* Type Badge */}
      <div className="flex items-center gap-2 mb-3">
        {isPracticeSession ? (
          <Badge variant="default" className="bg-primary/20 text-primary border-primary/30">
            <Clock className="w-3 h-3 mr-1" />
            Practice Session
          </Badge>
        ) : (
          <Badge variant="secondary">
            <FileText className="w-3 h-3 mr-1" />
            Quick Note
          </Badge>
        )}
      </div>

      <div className="flex items-start gap-3 mb-3">
        <Avatar className="w-8 h-8">
          <AvatarImage src={note.author?.avatar || ''} />
          <AvatarFallback><User className="w-4 h-4" /></AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">{note.author?.name}</p>
            {getVisibilityIcon()}
          </div>
          <p className="text-xs text-muted-foreground">
            {format(new Date(note.created_at), 'MMM d, yyyy · h:mm a')}
          </p>
        </div>

        {/* Visibility Toggle and Delete for Owner */}
        {isOwner && (
          <div className="flex items-center gap-1">
            <Select
              value={note.visibility}
              onValueChange={handleVisibilityChange}
            >
              <SelectTrigger
                className="w-28 h-8 text-xs"
                onClick={(e) => e.stopPropagation()}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent onClick={(e) => e.stopPropagation()}>
                <SelectItem value="private">
                  <div className="flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Private
                  </div>
                </SelectItem>
                <SelectItem value="friends">
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3" /> Friends
                  </div>
                </SelectItem>
                <SelectItem value="public">
                  <div className="flex items-center gap-1">
                    <Globe className="w-3 h-3" /> Public
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleDelete}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Linked Project */}
      {note.project_id && (
        <div
          className="flex items-center gap-2 mb-3 p-2 bg-secondary/30 rounded-lg cursor-pointer hover:bg-secondary/50 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/projects/${note.project_id}`);
          }}
        >
          <Disc3 className="w-4 h-4 text-accent" />
          <span className="text-sm text-accent">Linked to project</span>
        </div>
      )}

      {note.text_content && (
        <p className={`text-sm mb-3 whitespace-pre-wrap ${!expanded ? 'line-clamp-3' : ''}`}>
          {note.text_content}
        </p>
      )}

      {note.audio_files.length > 0 && (
        <div className="space-y-2 mb-3">
          {(expanded ? note.audio_files : note.audio_files.slice(0, 1)).map((url, i) => (
            <div key={i} className="flex items-center gap-2 p-2 bg-secondary/50 rounded-lg">
              <Mic className="w-4 h-4 text-primary flex-shrink-0" />
              <audio src={url} controls className="flex-1 h-8" onClick={(e) => e.stopPropagation()} />
            </div>
          ))}
          {!expanded && note.audio_files.length > 1 && (
            <p className="text-xs text-muted-foreground">+{note.audio_files.length - 1} more audio</p>
          )}
        </div>
      )}

      {note.image_files.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {(expanded ? note.image_files : note.image_files.slice(0, 4)).map((url, i) => (
            <img
              key={i}
              src={url}
              alt=""
              className={`${expanded ? 'w-full max-w-md' : 'w-20 h-20'} object-cover rounded-lg`}
              onClick={(e) => {
                e.stopPropagation();
                if (!expanded) navigate(`/notes/${note.id}`);
              }}
            />
          ))}
          {!expanded && note.image_files.length > 4 && (
            <div className="w-20 h-20 rounded-lg bg-secondary flex items-center justify-center text-sm text-muted-foreground">
              +{note.image_files.length - 4}
            </div>
          )}
        </div>
      )}

      {note.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {note.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
          ))}
        </div>
      )}
    </Card>
  );
}