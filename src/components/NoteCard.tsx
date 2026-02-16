import { memo, useCallback, useMemo, useState, useRef, useEffect } from 'react';
import { useTouchActive } from '@/hooks/useTouchActive';
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
import { ApplauseFooter } from '@/components/ApplauseFooter';
import { FolderOpen, Lock, Clock, Music, Trash2, Users, MessageCircle, Compass, ClipboardList, Settings, X, Flame, Pencil, Check, Calendar, Share, Play } from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import { getStreakTier } from '@/lib/streakUtils';
import { useNavigate } from 'react-router-dom';
import { useUpdateNoteVisibility, useRemoveNoteFocus, useUpdateNoteAudioNames, useUpdateNoteContent } from '@/hooks/useUpdateNote';
import { useDeleteNote, usePrefetchNote } from '@/hooks/useNotes';
import { useUpdateSessionDuration } from '@/hooks/useSessions';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { usePrefetchNoteComments } from '@/hooks/useNoteComments';
import { usePremium } from '@/contexts/PremiumContext';
import { useToast } from '@/hooks/use-toast';


// Combined text content component that handles line clamping for both note text and focus text together
interface CombinedTextContentProps {
  textContent: string | null;
  focusTextSnapshot: string | null;
  expanded?: boolean;
  inlineExpanded?: boolean;
  hasMediaBelow: boolean;
  onShowMore: () => void;
  onShowLess?: () => void;
}

function CombinedTextContent({ textContent, focusTextSnapshot, expanded, inlineExpanded, hasMediaBelow, onShowMore, onShowLess }: CombinedTextContentProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  // Check if the combined content exceeds 8 lines
  useEffect(() => {
    if (containerRef.current && !expanded && !inlineExpanded) {
      const element = containerRef.current;
      setIsTruncated(element.scrollHeight > element.clientHeight);
    }
  }, [textContent, focusTextSnapshot, expanded, inlineExpanded]);

  const hasContent = textContent || focusTextSnapshot;
  if (!hasContent) return null;

  const marginClass = hasMediaBelow ? 'mb-3' : 'pb-1';

  // In expanded view (detail page) or inline expanded, show everything without truncation
  if (expanded || inlineExpanded) {
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
        {/* Show less button when inline expanded on timeline */}
        {inlineExpanded && onShowLess && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onShowLess();
            }}
            className="text-sm text-primary hover:underline mt-2 block"
          >
            Show less
          </button>
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
  onShareClick?: () => void;
}

export const NoteCard = memo(function NoteCard({ note, expanded, fromFriends, fromProject, fromGig, onShareClick }: NoteCardProps) {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { isPremium, isLoading: isPremiumLoading, openPremiumDialog } = usePremium();
  const { toast } = useToast();
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
  const [isEditing, setIsEditing] = useState(false);
  const [editedTextContent, setEditedTextContent] = useState('');
  const [editedFocusText, setEditedFocusText] = useState('');
  const [sessionDurationOpen, setSessionDurationOpen] = useState(false);
  const [editedDuration, setEditedDuration] = useState('');
  const [isInlineExpanded, setIsInlineExpanded] = useState(false);
  
  // Touch state management for mobile - prevents highlight on scroll
  const { isPressed, touchHandlers } = useTouchActive(80);

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
  
  // Get streak info from author's profile for badge display
  const streakDays = note.author?.current_streak || 0;
  const achievementCounts = note.author?.streak_achievement_counts || {};
  
  // Find the best (highest) milestone ever achieved by looking at achievement counts
  const achievedMilestones = Object.keys(achievementCounts)
    .map(Number)
    .filter(m => achievementCounts[String(m)] > 0);
  const bestAchievedMilestone = achievedMilestones.length > 0 
    ? Math.max(...achievedMilestones) 
    : (streakDays >= 10 ? getStreakTier(streakDays).minDays : 0);
  
  // Get achievement count for the best milestone tier
  const streakAchievementCount = bestAchievedMilestone > 0 
    ? (achievementCounts[String(bestAchievedMilestone)] || 1)
    : 0;

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
    if (!note.project_id) return;
    
    // If non-owner (viewing friend's note) and not premium, show toast
    if (!isOwner && !isPremiumLoading && !isPremium) {
      toast({
        title: "Pro Feature",
        description: "Viewing linked projects, gigs, and goals is available for Pro users.",
        action: (
          <button
            onClick={openPremiumDialog}
            className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            See Pro
          </button>
        ),
      });
      return;
    }
    navigate(`/projects/${note.project_id}`);
  }, [navigate, note.project_id, isOwner, isPremium, isPremiumLoading, toast]);

  const handleNavigateToGig = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!note.gig_id) return;
    
    // If non-owner (viewing friend's note) and not premium, show toast
    if (!isOwner && !isPremiumLoading && !isPremium) {
      toast({
        title: "Pro Feature",
        description: "Viewing linked projects, gigs, and goals is available for Pro users.",
        action: (
          <button
            onClick={openPremiumDialog}
            className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            See Pro
          </button>
        ),
      });
      return;
    }
    navigate(`/gigs/${note.gig_id}`);
  }, [navigate, note.gig_id, isOwner, isPremium, isPremiumLoading, toast]);

  const handleNavigateToGoal = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    navigate('/working-toward');
  }, [navigate]);

  const projectName = note.project?.title || 'Project';
  const goalName = note.goal?.title || note.goal?.content || 'Goal';
  const gigName = note.gig?.title || 'Gig';

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
      data-note-id={note.id}
      className={`p-3 sm:p-4 bg-background text-foreground border border-border rounded-lg relative ${!expanded ? `cursor-pointer [@media(hover:hover)]:hover:bg-muted/50 ${isPressed ? 'bg-muted/50' : ''}` : ''} transition-colors duration-150`}
      onClick={!expanded ? handleNavigateToNote : undefined}
      onMouseEnter={handlePrefetch}
      {...(!expanded ? touchHandlers : {})}
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
                    className="inline-flex items-center text-xs cursor-pointer hover:bg-secondary/80 transition-colors"
                    onPointerDown={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        // Let Radix handle opening via click; we just synthesize one.
                        (e.currentTarget as HTMLDivElement).click();
                      }
                    }}
                  >
                    <Play className="w-3 h-3 mr-1 shrink-0" />
                    <span>Practice Session</span>
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
              <Badge variant="secondary" className="inline-flex items-center text-xs">
                <Play className="w-3 h-3 mr-1 shrink-0" />
                <span>Practice Session</span>
                {sessionDuration && <span className="ml-1 opacity-80">{sessionDuration}</span>}
              </Badge>
            )
          ) : (
            <Badge variant="secondary" className="inline-flex items-center text-xs">
              <Music className="w-3 h-3 mr-1 shrink-0" />
              <span>Quick Note</span>
            </Badge>
          )}
          
          {/* Focus Date Badge - now inline with type badge and tags */}
          {/* Practice Board badge removed - text is now shown in note content */}

          {/* Linked Goal Badge - only visible to note owner since goals are private */}
          {note.goal_id && isOwner && (
            <Badge 
              variant="outline" 
              className="inline-flex items-center text-xs border-primary/30 text-primary cursor-pointer hover:bg-primary/10 transition-colors"
              onClick={handleNavigateToGoal}
            >
              <Compass className="w-3 h-3 mr-1 shrink-0" />
              <span className="truncate max-w-[150px]">{goalName}</span>
            </Badge>
          )}

          {/* Linked Project Badge */}
          {note.project_id && (
            <Badge 
              variant="outline" 
              className="inline-flex items-center text-xs border-primary/30 text-primary cursor-pointer hover:bg-primary/10 transition-colors"
              onClick={handleNavigateToProject}
            >
              <FolderOpen className="w-3 h-3 mr-1 shrink-0" />
              <span className="truncate max-w-[150px]">{projectName}</span>
            </Badge>
          )}

          {/* Linked Gig Badge */}
          {note.gig_id && (
            <Badge 
              variant="outline" 
              className="inline-flex items-center text-xs border-primary/30 text-primary cursor-pointer hover:bg-primary/10 transition-colors"
              onClick={handleNavigateToGig}
            >
              <Calendar className="w-3 h-3 mr-1 shrink-0" />
              <span className="truncate max-w-[150px]">{gigName}</span>
            </Badge>
          )}
        </div>

        {/* Share & Settings buttons - top-aligned with tags */}
        {isOwner && expanded && (
          <div className="flex items-center gap-1 shrink-0">
            {/* Share Button */}
            {onShareClick && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                data-tour="share-button"
                onClick={(e) => {
                  e.stopPropagation();
                  onShareClick();
                }}
              >
                <Share className="w-4 h-4" />
              </Button>
            )}

            {/* Settings Menu (includes Delete) */}
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
                {/* Delete option */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem
                      onSelect={(e) => e.preventDefault()}
                      className="cursor-pointer text-destructive focus:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
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
            bestAchievedMilestone={bestAchievedMilestone}
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
          {/* Playing with collaborators */}
          {note.sessionCollaborators && note.sessionCollaborators.length > 0 && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Users className="w-3 h-3" />
              <span className="truncate">
                Playing with {note.sessionCollaborators.map(c => c.name).join(', ')}
              </span>
            </p>
          )}
        </div>
      </div>


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
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <ClipboardList className="w-3 h-3" />
                  Practice Board
                </p>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveFocus();
                    setIsEditing(false);
                  }}
                >
                  <X className="w-3 h-3 mr-1" />
                  Unlink
                </Button>
              </div>
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
          inlineExpanded={isInlineExpanded}
          hasMediaBelow={note.audio_files.length > 0 || note.image_files.length > 0}
          onShowMore={() => setIsInlineExpanded(true)}
          onShowLess={() => setIsInlineExpanded(false)}
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

      {/* Applause Footer with comment count */}
      <ApplauseFooter 
        noteId={note.id} 
        noteAuthorId={note.author_id}
        commentCount={note.comment_count}
        onCommentClick={handleNavigateToNote}
      />

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
