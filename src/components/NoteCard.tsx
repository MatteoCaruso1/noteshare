import { memo, useCallback, useMemo, useState } from 'react';
import { NoteWithAuthor } from '@/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ClickableAvatar } from '@/components/ClickableAvatar';
import { WaveformPlayer } from '@/components/WaveformPlayer';
import { RichTextContent } from '@/components/RichTextContent';
import { VoiceReplyButton } from '@/components/VoiceReplyButton';
import { StreakTintedName } from '@/components/StreakTintedName';
import { FocusViewDialog } from '@/components/FocusViewDialog';
import { SignedImage } from '@/components/SignedImage';
import { Disc3, Lock, Clock, Music, Trash2, Users, MessageCircle, Target, Crosshair, Settings, Plus, X, Flame } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useUpdateNoteVisibility, useRemoveNoteFocus, useUpdateNoteAudioNames } from '@/hooks/useUpdateNote';
import { useDeleteNote, usePrefetchNote } from '@/hooks/useNotes';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { usePrefetchNoteComments } from '@/hooks/useNoteComments';

interface NoteCardProps {
  note: NoteWithAuthor;
  expanded?: boolean;
  fromFriends?: boolean;
  fromProject?: string;
  fromGig?: string;
  onTagsChange?: (tags: string[]) => void;
  recentTags?: string[];
}

export const NoteCard = memo(function NoteCard({ note, expanded, fromFriends, fromProject, fromGig, onTagsChange, recentTags = [] }: NoteCardProps) {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const updateVisibility = useUpdateNoteVisibility();
  const updateAudioNames = useUpdateNoteAudioNames();
  const removeNoteFocus = useRemoveNoteFocus();
  const deleteNote = useDeleteNote();
  const queryClient = useQueryClient();
  const prefetchNote = usePrefetchNote();
  const prefetchComments = usePrefetchNoteComments();
  const [focusDialogOpen, setFocusDialogOpen] = useState(false);
  const [tagInputOpen, setTagInputOpen] = useState(false);
  const [newTagValue, setNewTagValue] = useState('');

  const canEditTags = expanded && onTagsChange;

  const handleAddTag = useCallback((tag: string) => {
    const trimmedTag = tag.trim().toLowerCase();
    if (trimmedTag && !note.tags?.includes(trimmedTag) && onTagsChange) {
      onTagsChange([...(note.tags || []), trimmedTag]);
    }
    setNewTagValue('');
    setTagInputOpen(false);
  }, [note.tags, onTagsChange]);

  const handleRemoveTag = useCallback((tagToRemove: string) => {
    if (onTagsChange) {
      onTagsChange((note.tags || []).filter(t => t !== tagToRemove));
    }
  }, [note.tags, onTagsChange]);

  const availableRecentTags = recentTags.filter(t => !note.tags?.includes(t));

  const handleRemoveFocus = useCallback(() => {
    removeNoteFocus.mutate(note.id);
  }, [removeNoteFocus, note.id]);

  const handleRenameAudio = useCallback((index: number, newName: string) => {
    const newNames = [...(note.audio_file_names || note.audio_files.map(() => ''))];
    newNames[index] = newName;
    updateAudioNames.mutate({ noteId: note.id, audioFileNames: newNames });
  }, [note.id, note.audio_file_names, note.audio_files, updateAudioNames]);

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

  // Calculate session duration - memoized (accounting for paused time)
  const sessionDuration = useMemo(() => {
    if (!note.session?.started_at || !note.session?.ended_at) return null;
    
    const start = new Date(note.session.started_at).getTime();
    const end = new Date(note.session.ended_at).getTime();
    const pausedMs = note.session.paused_duration_ms || 0;
    const activeDurationMs = (end - start) - pausedMs;
    const durationMinutes = Math.round(activeDurationMs / 60000);
    
    if (durationMinutes < 5) {
      return `~${Math.max(1, durationMinutes)}m`;
    }
    const rounded = Math.round(durationMinutes / 5) * 5;
    return `~${rounded}m`;
  }, [note.session?.started_at, note.session?.ended_at, note.session?.paused_duration_ms]);

  const handleNavigateToNote = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    const navState = fromFriends 
      ? { fromFriends: true } 
      : fromProject 
        ? { fromProject } 
        : fromGig 
          ? { fromGig } 
          : undefined;
    navigate(`/notes/${note.id}`, { state: navState });
  }, [navigate, note.id, fromFriends, fromProject, fromGig]);

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
      className={`p-3 sm:p-4 bg-background text-foreground border border-border rounded-lg relative ${!expanded ? 'cursor-pointer hover:bg-muted/50' : ''} transition-colors duration-150`}
      onClick={!expanded ? handleNavigateToNote : undefined}
      onMouseEnter={handlePrefetch}
      onTouchStart={handlePrefetch}
    >
      {/* Type Badge Row - includes tags and focus tag */}
      <div className="flex items-start gap-2 mb-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap flex-1">
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
          
          {/* Custom Tags - appear left of Focus badge */}
          {note.tags && note.tags.length > 0 && note.tags.map((tag) => (
            <Badge 
              key={tag}
              variant="secondary" 
              className="text-xs bg-secondary text-secondary-foreground group/tag"
            >
              {tag}
              {canEditTags && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveTag(tag);
                  }}
                  className="ml-1 opacity-0 group-hover/tag:opacity-100 hover:text-destructive transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </Badge>
          ))}
          
          {/* Add Tag Button - only in expanded view for owner */}
          {canEditTags && (
            <Popover open={tagInputOpen} onOpenChange={setTagInputOpen}>
              <PopoverTrigger asChild>
                <button
                  onClick={(e) => e.stopPropagation()}
                  className="h-5 w-5 rounded-full bg-secondary/50 hover:bg-secondary flex items-center justify-center transition-colors"
                >
                  <Plus className="w-3 h-3 text-muted-foreground" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-3 bg-popover" align="start" onClick={(e) => e.stopPropagation()}>
                <div className="space-y-3">
                  <Input
                    placeholder="Add tag..."
                    value={newTagValue}
                    onChange={(e) => setNewTagValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newTagValue.trim()) {
                        e.preventDefault();
                        handleAddTag(newTagValue);
                      }
                    }}
                    className="h-8 text-sm"
                    autoFocus
                  />
                  {availableRecentTags.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs text-muted-foreground">Recent</p>
                      <div className="flex flex-wrap gap-1.5">
                        {availableRecentTags.slice(0, 6).map((tag) => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className="text-xs px-2 py-0.5 cursor-pointer hover:bg-secondary transition-colors"
                            onClick={() => handleAddTag(tag)}
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          )}
          
          {/* Focus Date Badge - now inline with type badge and tags */}
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

        {/* Delete & Settings buttons - top-aligned with tags */}
        {isOwner && expanded && (
          <div className="flex items-center gap-1 shrink-0">
            {/* Delete Button - standalone grey button */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-muted-foreground hover:bg-muted"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Delete {isPracticeSession ? 'session' : 'note'}?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This cannot be undone.
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

            {/* Settings Menu */}
            <DropdownMenu modal={false}>
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
                      Make viewable
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 mr-2" />
                      Make private
                    </>
                  )}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
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

      {/* Author info - text vertically centered with avatar */}
      <div className="flex items-center gap-3 mb-3">
        <ClickableAvatar
          profileId={note.author_id}
          avatar={note.author?.avatar}
          name={note.author?.name}
          size="md"
        />
        <div className="flex-1 min-w-0">
          <StreakTintedName 
            name={note.author?.name || 'Unknown'} 
            streakDays={streakDays}
            className="text-sm font-medium truncate"
          />
          {/* Short date in timeline only */}
          {!expanded && (
          <p className="text-xs text-muted-foreground">
              {isToday(new Date(note.created_at)) 
                ? 'Today' 
                : isYesterday(new Date(note.created_at)) 
                  ? 'Yesterday' 
                  : format(new Date(note.created_at), 'MMM d')}
            </p>
          )}
        </div>
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

      {/* Focus Text - displayed inline when note has a focus date */}
      {note.focus_text_snapshot && (
        <div className="mb-3 pl-3 border-l-2 border-primary/30">
          <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1">
            <Crosshair className="w-3 h-3" />
            Today's Focus
          </p>
          <p className="text-sm text-muted-foreground italic">{note.focus_text_snapshot}</p>
        </div>
      )}

      {note.text_content && (
        <RichTextContent 
          content={note.text_content} 
          className={`${note.audio_files.length > 0 || note.image_files.length > 0 ? 'mb-3' : ''}`}
          lineClamp={!expanded ? 3 : undefined}
        />
      )}

      {note.audio_files.length > 0 && (
        <div className={`space-y-2 ${note.image_files.length > 0 ? 'mb-3' : ''}`}>
          {(expanded ? note.audio_files : note.audio_files.slice(0, 1)).map((url, i) => (
            <WaveformPlayer 
              key={i}
              src={url} 
              title={note.audio_file_names?.[i]}
              onRename={expanded && isOwner ? (newName) => handleRenameAudio(i, newName) : undefined}
            />
          ))}
          {!expanded && note.audio_files.length > 1 && (
            <p className="text-xs text-muted-foreground">+{note.audio_files.length - 1} more audio</p>
          )}
        </div>
      )}

      {note.image_files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {(expanded ? note.image_files : note.image_files.slice(0, 4)).map((url, i) => (
            <SignedImage
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

      {/* Full timestamp at bottom in expanded view */}
      {expanded && (
        <p className="text-xs text-muted-foreground/60 mt-3">
          {format(new Date(note.created_at), 'h:mm a · MMM d, yyyy')}
        </p>
      )}

      {/* Voice Reply Button - hidden on homepage for cleaner UI */}
      {/* Keeping functionality intact - can be re-enabled by removing the false && check */}
      {false && profile && !expanded && (
        <div className="flex items-center gap-2 pt-2 border-t border-border">
          <VoiceReplyButton
            noteId={note.id}
            authorId={profile.id}
            noteOwnerId={note.author_id}
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
