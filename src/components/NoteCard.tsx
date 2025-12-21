import { memo, useCallback, useMemo, useState } from 'react';
import { NoteWithAuthor } from '@/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ClickableAvatar } from '@/components/ClickableAvatar';
import { WaveformPlayer } from '@/components/WaveformPlayer';
import { RichTextContent } from '@/components/RichTextContent';
import { VoiceReplyButton } from '@/components/VoiceReplyButton';
import { StreakTintedName } from '@/components/StreakTintedName';
import { FocusViewDialog } from '@/components/FocusViewDialog';
import { Disc3, Lock, Clock, Music, Trash2, Users, MessageCircle, Target, Crosshair, Settings } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useUpdateNoteVisibility, useRemoveNoteFocus } from '@/hooks/useUpdateNote';
import { useDeleteNote, usePrefetchNote } from '@/hooks/useNotes';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { usePrefetchNoteComments } from '@/hooks/useNoteComments';

interface NoteCardProps {
  note: NoteWithAuthor;
  expanded?: boolean;
  fromFriends?: boolean;
}

export const NoteCard = memo(function NoteCard({ note, expanded, fromFriends }: NoteCardProps) {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const updateVisibility = useUpdateNoteVisibility();
  const removeNoteFocus = useRemoveNoteFocus();
  const deleteNote = useDeleteNote();
  const queryClient = useQueryClient();
  const prefetchNote = usePrefetchNote();
  const prefetchComments = usePrefetchNoteComments();
  const [focusDialogOpen, setFocusDialogOpen] = useState(false);

  const handleRemoveFocus = useCallback(() => {
    removeNoteFocus.mutate(note.id);
  }, [removeNoteFocus, note.id]);

  const isOwner = profile?.id === note.author_id;
  const isPracticeSession = !!note.session_id;
  
  // Get streak from author's profile for tint display
  const streakDays = note.author?.current_streak || 0;

  const handleVisibilityChange = useCallback((value: string) => {
    updateVisibility.mutate({
      noteId: note.id,
      visibility: value as 'private' | 'friends',
    });
  }, [updateVisibility, note.id]);

  const handleDelete = useCallback(() => {
    deleteNote.mutate(
      { noteId: note.id, sessionId: note.session_id },
      {
        onSuccess: () => {
          // If in expanded/detail view, navigate back to home
          if (expanded) {
            navigate('/');
          }
        },
      }
    );
  }, [deleteNote, note.id, note.session_id, expanded, navigate]);

  const visibilityIcon = useMemo(() => {
    switch (note.visibility) {
      case 'private':
        return <Lock className="w-3 h-3 text-muted-foreground" />;
      case 'friends':
        return <Users className="w-3 h-3 text-primary" />;
      default:
        return <Lock className="w-3 h-3 text-muted-foreground" />;
    }
  }, [note.visibility]);

  // Calculate session duration - memoized
  const sessionDuration = useMemo(() => {
    if (!note.session?.started_at || !note.session?.ended_at) return null;
    
    const start = new Date(note.session.started_at).getTime();
    const end = new Date(note.session.ended_at).getTime();
    const durationMinutes = Math.round((end - start) / 60000);
    
    if (durationMinutes < 5) {
      return `~${Math.max(1, durationMinutes)}m`;
    }
    const rounded = Math.round(durationMinutes / 5) * 5;
    return `~${rounded}m`;
  }, [note.session?.started_at, note.session?.ended_at]);

  const handleNavigateToNote = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigate(`/notes/${note.id}`, { state: fromFriends ? { fromFriends: true } : undefined });
  }, [navigate, note.id, fromFriends]);

  const handleNavigateToProject = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (note.project_id) {
      navigate(`/projects/${note.project_id}`);
    }
  }, [navigate, note.project_id]);

  const projectName = note.project?.title || 'Project';
  const goalName = note.goal?.title || note.goal?.content || 'Goal';

  const handleInvalidateComments = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['note-comments', note.id] });
  }, [queryClient, note.id]);

  // Prefetch note data and comments on hover for faster navigation
  const handlePrefetch = useCallback(() => {
    if (!expanded) {
      prefetchNote(note.id);
      prefetchComments(note.id);
    }
  }, [expanded, prefetchNote, prefetchComments, note.id]);

  return (
    <Card
      className={`p-3 sm:p-4 bg-card border-border ${!expanded ? 'cursor-pointer hover:border-primary/50' : ''} transition-colors`}
      onClick={!expanded ? handleNavigateToNote : undefined}
      onMouseEnter={handlePrefetch}
      onTouchStart={handlePrefetch}
    >
      {/* Type Badge Row - includes focus tag */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        {isPracticeSession ? (
          <Badge variant="secondary" className="text-xs">
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
        
        {/* Focus Date Badge - now inline with type badge */}
        {note.focus_date && (
          <Badge 
            variant="outline" 
            className="text-xs border-primary/30 text-primary cursor-pointer hover:bg-primary/10 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setFocusDialogOpen(true);
            }}
          >
            <Crosshair className="w-3 h-3 mr-1" />
            {/* Parse date parts directly to avoid timezone conversion issues */}
            {(() => {
              const [year, month, day] = note.focus_date.split('-').map(Number);
              return `${month.toString().padStart(2, '0')}/${day.toString().padStart(2, '0')}/${year.toString().slice(-2)}`;
            })()} Focus
          </Badge>
        )}
      </div>

      {/* Focus View Dialog - rendered outside the Card click handler */}
      {focusDialogOpen && (
        <div onClick={(e) => e.stopPropagation()}>
          <FocusViewDialog
            open={focusDialogOpen}
            onOpenChange={setFocusDialogOpen}
            focusDate={note.focus_date || ''}
            focusText={note.focus_text_snapshot || ''}
            onRemove={handleRemoveFocus}
            canRemove={isOwner}
          />
        </div>
      )}

      <div className="flex items-start gap-3 mb-3">
        <ClickableAvatar
          profileId={note.author_id}
          avatar={note.author?.avatar}
          name={note.author?.name}
          size="md"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <StreakTintedName 
              name={note.author?.name || 'Unknown'} 
              streakDays={streakDays}
              className="text-sm font-medium truncate"
            />
            {visibilityIcon}
          </div>
          <p className="text-xs text-muted-foreground">
            {format(new Date(note.created_at), 'MMM d, yyyy · h:mm a')}
          </p>
        </div>

        {/* Settings Menu for Owner - only show in expanded/detail view */}
        {isOwner && expanded && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={(e) => e.stopPropagation()}
              >
                <Settings className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem
                onClick={() => handleVisibilityChange(note.visibility === 'private' ? 'friends' : 'private')}
                className="cursor-pointer"
              >
                {note.visibility === 'private' ? (
                  <>
                    <Users className="w-4 h-4 mr-2" />
                    Make visible to friends
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    Make private
                  </>
                )}
              </DropdownMenuItem>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem
                    onSelect={(e) => e.preventDefault()}
                    className="cursor-pointer text-destructive focus:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete {isPracticeSession ? 'Session' : 'Note'}
                  </DropdownMenuItem>
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
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Linked Project */}
      {note.project_id && (
        <div
          className="flex items-center gap-2 mb-3 p-2 bg-primary/10 rounded-lg cursor-pointer hover:bg-primary/20 transition-colors"
          onClick={handleNavigateToProject}
        >
          <Disc3 className="w-4 h-4 text-primary" />
          <span className="text-sm text-primary truncate">{projectName}</span>
        </div>
      )}

      {/* Linked Goal - only visible to note owner since goals are private */}
      {note.goal_id && isOwner && (
        <div className="flex items-center gap-2 mb-3 p-2 bg-primary/10 rounded-lg">
          <Target className="w-4 h-4 text-primary" />
          <span className="text-sm text-primary truncate">{goalName}</span>
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

      {/* Voice Reply Button */}
      {profile && !expanded && (
        <div className="flex items-center gap-2 pt-2 border-t border-border">
          <VoiceReplyButton
            noteId={note.id}
            authorId={profile.id}
            onSuccess={handleInvalidateComments}
          />
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground hover:text-foreground"
            onClick={handleNavigateToNote}
          >
            <MessageCircle className="w-4 h-4 mr-1" />
            {note.comment_count > 0 ? (
              <>
                {note.comment_count} {note.comment_count === 1 ? 'Comment' : 'Comments'}
              </>
            ) : (
              'Comment'
            )}
          </Button>
        </div>
      )}
    </Card>
  );
});
