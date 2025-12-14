import { NoteWithAuthor } from '@/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ClickableAvatar } from '@/components/ClickableAvatar';
import { WaveformPlayer } from '@/components/WaveformPlayer';
import { RichTextContent } from '@/components/RichTextContent';
import { VoiceReplyButton } from '@/components/VoiceReplyButton';
import { Disc3, Lock, Clock, Music, Trash2, Users, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useUpdateNoteVisibility } from '@/hooks/useUpdateNote';
import { useDeleteNote } from '@/hooks/useNotes';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { useNoteCommentCount } from '@/hooks/useNoteCommentCount';

interface NoteCardProps {
  note: NoteWithAuthor;
  expanded?: boolean;
}

export function NoteCard({ note, expanded }: NoteCardProps) {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const updateVisibility = useUpdateNoteVisibility();
  const deleteNote = useDeleteNote();
  const queryClient = useQueryClient();
  const { data: commentCount } = useNoteCommentCount(note.id);

  const isOwner = profile?.id === note.author_id;
  const isPracticeSession = !!note.session_id;

  const handleVisibilityChange = (value: string) => {
    updateVisibility.mutate({
      noteId: note.id,
      visibility: value as 'private' | 'friends',
    });
  };

  const handleDelete = () => {
    deleteNote.mutate({ noteId: note.id, sessionId: note.session_id });
  };

  const getVisibilityIcon = () => {
    switch (note.visibility) {
      case 'private':
        return <Lock className="w-3 h-3 text-muted-foreground" />;
      case 'friends':
        return <Users className="w-3 h-3 text-primary" />;
      default:
        return <Lock className="w-3 h-3 text-muted-foreground" />;
    }
  };

  // Calculate session duration
  const getSessionDuration = () => {
    if (!note.session?.started_at || !note.session?.ended_at) return null;
    
    const start = new Date(note.session.started_at).getTime();
    const end = new Date(note.session.ended_at).getTime();
    const durationMinutes = Math.round((end - start) / 60000);
    
    if (durationMinutes < 5) {
      // Round to nearest 1 minute for short sessions
      return `~${Math.max(1, durationMinutes)}m`;
    }
    // Round to nearest 5 minutes
    const rounded = Math.round(durationMinutes / 5) * 5;
    return `~${rounded}m`;
  };

  const sessionDuration = getSessionDuration();

  return (
    <Card
      className={`p-3 sm:p-4 bg-card border-border ${!expanded ? 'cursor-pointer hover:border-primary/50' : ''} transition-colors`}
      onClick={!expanded ? () => navigate(`/notes/${note.id}`) : undefined}
    >
      {/* Type Badge */}
      <div className="flex items-center gap-2 mb-3">
        {isPracticeSession ? (
          <Badge variant="default" className="bg-primary/20 text-primary border-primary/30 text-xs">
            <Clock className="w-3 h-3 mr-1" />
            Practice Session
            {sessionDuration && <span className="ml-1 opacity-80">{sessionDuration}</span>}
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-xs">
            <Music className="w-3 h-3 mr-1" />
            Quick Note
          </Badge>
        )}
      </div>

      <div className="flex items-start gap-3 mb-3">
        <ClickableAvatar
          profileId={note.author_id}
          avatar={note.author?.avatar}
          name={note.author?.name}
          size="md"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium truncate">{note.author?.name}</p>
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
                className="w-24 sm:w-28 h-8 text-xs"
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
              </SelectContent>
            </Select>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {isPracticeSession ? 'Delete Practice Session?' : 'Delete Note?'}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {isPracticeSession 
                      ? 'This will permanently delete this practice session and its note. This action cannot be undone.'
                      : 'This will permanently delete this note. This action cannot be undone.'}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
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
        <RichTextContent 
          content={note.text_content} 
          className="mb-3"
          lineClamp={!expanded ? 3 : undefined}
        />
      )}

      {note.audio_files.length > 0 && (
        <div className="space-y-2 mb-3">
          {(expanded ? note.audio_files : note.audio_files.slice(0, 1)).map((url, i) => (
            <WaveformPlayer 
              key={i} 
              src={url} 
              title={note.audio_file_names?.[i]}
            />
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
              className={`${expanded ? 'w-full max-w-md' : 'w-16 h-16 sm:w-20 sm:h-20'} object-cover rounded-lg`}
              onClick={(e) => {
                e.stopPropagation();
                if (!expanded) navigate(`/notes/${note.id}`);
              }}
            />
          ))}
          {!expanded && note.image_files.length > 4 && (
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg bg-secondary flex items-center justify-center text-sm text-muted-foreground">
              +{note.image_files.length - 4}
            </div>
          )}
        </div>
      )}

      {note.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {note.tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
          ))}
        </div>
      )}

      {/* Voice Reply Button */}
      {profile && !expanded && (
        <div className="flex items-center gap-2 pt-2 border-t border-border">
          <VoiceReplyButton
            noteId={note.id}
            authorId={profile.id}
            onSuccess={() => queryClient.invalidateQueries({ queryKey: ['note-comments', note.id] })}
          />
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/notes/${note.id}`);
            }}
          >
            <MessageCircle className="w-4 h-4 mr-1" />
            Comments
            {commentCount !== undefined && commentCount > 0 && (
              <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-[10px]">
                {commentCount}
              </Badge>
            )}
          </Button>
        </div>
      )}
    </Card>
  );
}
