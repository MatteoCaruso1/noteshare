import { memo, useCallback, useMemo, useState, useRef, useEffect } from 'react';
import { NoteWithAuthor } from '@/types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RichTextarea } from '@/components/RichTextarea';
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
import { Disc3, Lock, Clock, Music, Trash2, Users, MessageCircle, Target, ClipboardList, Settings, Plus, X, Flame, Pencil, Check } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { getStreakTier } from '@/lib/streakUtils';
import { useNavigate } from 'react-router-dom';
import { useUpdateNoteVisibility, useRemoveNoteFocus, useUpdateNoteAudioNames, useUpdateNoteContent } from '@/hooks/useUpdateNote';
import { useDeleteNote, usePrefetchNote } from '@/hooks/useNotes';
import { useUpdateSessionDuration } from '@/hooks/useSessions';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { usePrefetchNoteComments } from '@/hooks/useNoteComments';

// Combined text content component that handles line clamping for both note text and focus text together
interface CombinedTextContentProps {
  textContent: string | null;
  focusTextSnapshot: string | null;
  expanded?: boolean;
  hasMediaBelow: boolean;
  onShowMore: () => void;
}

function CombinedTextContent({ textContent, focusTextSnapshot, expanded, hasMediaBelow, onShowMore }: CombinedTextContentProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  // Check if the combined content exceeds 8 lines
  useEffect(() => {
    if (containerRef.current && !expanded) {
      const element = containerRef.current;
      setIsTruncated(element.scrollHeight > element.clientHeight);
    }
  }, [textContent, focusTextSnapshot, expanded]);

  const hasContent = textContent || focusTextSnapshot;
  if (!hasContent) return null;

  const marginClass = hasMediaBelow ? 'mb-3' : 'pb-1';

  // In expanded view, show everything without truncation
  if (expanded) {
    return (
      <div className={marginClass}>
        {textContent && (
          <RichTextContent 
            content={textContent} 
            className={focusTextSnapshot ? 'mb-3' : ''}
          />
        )}
        {focusTextSnapshot && (
          <div className="pl-3 border-l-2 border-primary/30">
            <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <ClipboardList className="w-3 h-3" />
              Practice Board
            </p>
            <RichTextContent 
              content={focusTextSnapshot} 
              className="text-sm text-muted-foreground"
            />
          </div>
        )}
      </div>
    );
  }

  // In timeline view, apply line clamp to the combined container
  return (
    <div className={marginClass}>
      <div 
        ref={containerRef}
        className="overflow-hidden"
        style={{ 
          display: '-webkit-box',
          WebkitLineClamp: 8,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden'
        }}
      >
        {textContent && (
          <RichTextContent 
            content={textContent} 
            className={focusTextSnapshot ? 'mb-2' : ''}
          />
        )}
        {focusTextSnapshot && (
          <div className="pl-3 border-l-2 border-primary/30">
            <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <ClipboardList className="w-3 h-3" />
              Practice Board
            </p>
            <RichTextContent 
              content={focusTextSnapshot} 
              className="text-sm text-muted-foreground"
            />
          </div>
        )}
      </div>
      {isTruncated && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onShowMore();
          }}
          className="text-sm text-primary hover:underline mt-1 block"
        >
          Show more
        </button>
      )}
    </div>
  );
}

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
  const updateContent = useUpdateNoteContent();
  const updateSessionDuration = useUpdateSessionDuration();
  const removeNoteFocus = useRemoveNoteFocus();
  const deleteNote = useDeleteNote();
  const queryClient = useQueryClient();
  const prefetchNote = usePrefetchNote();
  const prefetchComments = usePrefetchNoteComments();
  const [focusDialogOpen, setFocusDialogOpen] = useState(false);
  const [tagInputOpen, setTagInputOpen] = useState(false);
  const [newTagValue, setNewTagValue] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editedTextContent, setEditedTextContent] = useState('');
  const [editedFocusText, setEditedFocusText] = useState('');
  const [sessionDurationOpen, setSessionDurationOpen] = useState(false);
  const [editedDuration, setEditedDuration] = useState('');
  

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
  const streakAchievementCount = note.author?.streak_achievement_counts?.[
    String(getStreakTier(streakDays).minDays)
  ] || 0;

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
  const sessionDurationData = useMemo(() => {
    if (!note.session?.started_at || !note.session?.ended_at) return null;
    
    const start = new Date(note.session.started_at).getTime();
    const end = new Date(note.session.ended_at).getTime();
    const pausedMs = note.session.paused_duration_ms || 0;
    const activeDurationMs = (end - start) - pausedMs;
    const durationMinutes = Math.round(activeDurationMs / 60000);
    
    let displayDuration: string;
    if (durationMinutes < 5) {
      displayDuration = `~${Math.max(1, durationMinutes)}m`;
    } else {
      const rounded = Math.round(durationMinutes / 5) * 5;
      displayDuration = `~${rounded}m`;
    }
    
    return { durationMinutes, displayDuration };
  }, [note.session?.started_at, note.session?.ended_at, note.session?.paused_duration_ms]);

  const sessionDuration = sessionDurationData?.displayDuration || null;

  // Optimistic display duration (shows edited value immediately)
  const displayDuration = useMemo(() => {
    if (sessionDurationOpen && editedDuration) {
      const mins = parseInt(editedDuration, 10);
      if (!isNaN(mins) && mins >= 1) {
        return `~${mins}m`;
      }
    }
    return sessionDuration;
  }, [sessionDurationOpen, editedDuration, sessionDuration]);

  // Handler for updating session duration
  const handleUpdateSessionDuration = useCallback(() => {
    if (!note.session_id || !editedDuration) return;
    
    const minutes = parseInt(editedDuration, 10);
    if (isNaN(minutes) || minutes < 1) return;
    
    updateSessionDuration.mutate({
      sessionId: note.session_id,
      durationMinutes: minutes,
    }, {
      onSuccess: () => {
        setSessionDurationOpen(false);
        setEditedDuration('');
      }
    });
  }, [note.session_id, editedDuration, updateSessionDuration]);

  // Counter to force fresh input mount on each open (prevents browser restore)
  const [durationEditorKey, setDurationEditorKey] = useState(0);

  // Handle popover open/close - always start with empty input
  const handleSessionDurationOpenChange = useCallback((open: boolean) => {
    // Clear on both open and close to guarantee blank state
    setEditedDuration('');
    if (open) {
      // Increment key to force React to remount input, defeating browser restore
      setDurationEditorKey(k => k + 1);
    }
    setSessionDurationOpen(open);
  }, []);

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

  // Edit mode handlers
  const handleStartEdit = useCallback(() => {
    // Strip HTML tags for plain text editing
    const stripHtml = (html: string) => {
      const tmp = document.createElement('div');
      tmp.innerHTML = html;
      return tmp.textContent || tmp.innerText || '';
    };
    setEditedTextContent(stripHtml(note.text_content || ''));
    setEditedFocusText(stripHtml(note.focus_text_snapshot || ''));
    setIsEditing(true);
  }, [note.text_content, note.focus_text_snapshot]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditedTextContent('');
    setEditedFocusText('');
  }, []);

  const handleSaveEdit = useCallback(() => {
    updateContent.mutate({
      noteId: note.id,
      textContent: editedTextContent || null,
      focusTextSnapshot: note.focus_text_snapshot ? editedFocusText || null : undefined,
    }, {
      onSuccess: () => {
        setIsEditing(false);
      }
    });
  }, [note.id, note.focus_text_snapshot, editedTextContent, editedFocusText, updateContent]);

  return (
    <Card
      className={`p-3 sm:p-4 bg-background text-foreground border border-border rounded-lg relative ${!expanded ? 'cursor-pointer [@media(hover:hover)]:hover:bg-muted/50 active:bg-muted/50' : ''} transition-colors duration-150`}
      onClick={!expanded ? handleNavigateToNote : undefined}
      onMouseEnter={handlePrefetch}
      onTouchStart={handlePrefetch}
    >
      {/* Type Badge Row - includes tags and focus tag */}
      <div className="flex items-start gap-2 mb-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap flex-1">
          {isPracticeSession ? (
            isOwner && expanded ? (
              <Popover open={sessionDurationOpen} onOpenChange={handleSessionDurationOpenChange}>
                <PopoverTrigger asChild>
                  <Badge
                    variant="secondary"
                    role="button"
                    tabIndex={0}
                    className="text-xs cursor-pointer hover:bg-secondary/80 transition-colors"
                    onPointerDown={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        // Let Radix handle opening via click; we just synthesize one.
                        (e.currentTarget as HTMLDivElement).click();
                      }
                    }}
                  >
                    <Clock className="w-3 h-3 mr-1" />
                    Practice Session
                    {displayDuration && <span className="ml-1 opacity-80">{displayDuration}</span>}
                  </Badge>
                </PopoverTrigger>
                <PopoverContent className="w-44 p-2.5 bg-popover overflow-hidden" align="start" onClick={(e) => e.stopPropagation()}>
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Edit session duration</p>
                    <div className="flex items-center gap-2">
                      <Input
                        key={`duration-input-${note.id}-${durationEditorKey}`}
                        type="text"
                        inputMode="numeric"
                        name="sessionDurationMinutes"
                        autoComplete="new-password"
                        value={editedDuration}
                        onChange={(e) => {
                          // Allow clearing; keep only digits
                          const next = e.target.value.replace(/[^0-9]/g, '');
                          setEditedDuration(next);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleUpdateSessionDuration();
                          }
                        }}
                        className="h-7 w-16 text-sm focus-visible:ring-1 focus-visible:ring-ring/50"
                        placeholder="min"
                        aria-label="Session duration in minutes"
                        autoFocus
                      />
                      <span className="text-sm text-muted-foreground">min</span>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="w-full h-7 text-xs"
                      onClick={handleUpdateSessionDuration}
                      disabled={updateSessionDuration.isPending || !editedDuration}
                    >
                      {updateSessionDuration.isPending ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            ) : (
              <Badge variant="secondary" className="text-xs">
                <Clock className="w-3 h-3 mr-1" />
                Practice Session
                {sessionDuration && <span className="ml-1 opacity-80">{sessionDuration}</span>}
              </Badge>
            )
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
              <ClipboardList className="w-3 h-3 mr-1" />
              Practice Board
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
                  onClick={handleStartEdit}
                  className="cursor-pointer"
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit
                </DropdownMenuItem>
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
            achievementCount={streakAchievementCount}
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

      {/* Text Content - editable or display mode */}
      {isEditing ? (
        <div className="space-y-3 mb-3" onClick={(e) => e.stopPropagation()}>
          <RichTextarea
            value={editedTextContent}
            onChange={setEditedTextContent}
            placeholder="Note content..."
            autoExpand={true}
            rows={2}
          />
          
          {/* Focus Text editing */}
          {note.focus_text_snapshot && (
            <div className="pl-3 border-l-2 border-primary/30">
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <ClipboardList className="w-3 h-3" />
                Practice Board
              </p>
              <RichTextarea
                value={editedFocusText}
                onChange={setEditedFocusText}
                placeholder="Practice board text..."
                autoExpand={true}
                rows={3}
              />
            </div>
          )}

          {/* Save/Cancel buttons */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs text-muted-foreground"
              onClick={(e) => {
                e.stopPropagation();
                handleCancelEdit();
              }}
            >
              <X className="w-3 h-3 mr-1" />
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                handleSaveEdit();
              }}
              disabled={updateContent.isPending}
            >
              <Check className="w-3 h-3 mr-1" />
              Save
            </Button>
          </div>
        </div>
      ) : (
        <CombinedTextContent
          textContent={note.text_content}
          focusTextSnapshot={note.focus_text_snapshot}
          expanded={expanded}
          hasMediaBelow={note.audio_files.length > 0 || note.image_files.length > 0}
          onShowMore={handleNavigateToNote}
        />
      )}

      {note.audio_files.length > 0 && (
        <div className={`space-y-2 ${note.image_files.length > 0 ? 'mb-3' : 'pb-1'}`}>
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
        <div className="flex flex-wrap gap-2 pb-1">
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
