import { memo, useCallback, useMemo } from 'react';
import { useNoteApplause, useGiveApplause, useRemoveApplause } from '@/hooks/useApplause';
import { useAuth } from '@/hooks/useAuth';
import { ClickableAvatar } from '@/components/ClickableAvatar';
import { cn } from '@/lib/utils';
import { ClappingHandsIcon } from '@/components/icons/ClappingHandsIcon';
import { MessageCircle } from 'lucide-react';

interface ApplauseFooterProps {
  noteId: string;
  noteAuthorId: string;
  commentCount?: number;
  onCommentClick?: () => void;
  className?: string;
  reserveSpace?: boolean;
}

export const ApplauseFooter = memo(function ApplauseFooter({ 
  noteId, 
  noteAuthorId,
  commentCount = 0,
  onCommentClick,
  className,
  reserveSpace = false,
}: ApplauseFooterProps) {
  const { profile } = useAuth();
  const { data: applauseList = [], isLoading } = useNoteApplause(noteId);
  const giveApplause = useGiveApplause();
  const removeApplause = useRemoveApplause();

  const hasApplauded = useMemo(() => 
    profile ? applauseList.some(a => a.user_id === profile.id) : false,
    [applauseList, profile]
  );

  const isOwner = profile?.id === noteAuthorId;
  const applauseCount = applauseList.length;

  // Get first applauder for display
  const firstApplauder = applauseList[0]?.profile;

  const handleToggleApplause = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!profile) return;

    if (hasApplauded) {
      removeApplause.mutate(noteId);
    } else {
      giveApplause.mutate(noteId);
    }
  }, [profile, hasApplauded, noteId, giveApplause, removeApplause]);

  const handleCommentClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onCommentClick?.();
  }, [onCommentClick]);

  // Show placeholder while loading to prevent layout shift
  if (isLoading) {
    return (
      <div 
        className={cn(
          "flex items-center justify-between pt-2 mt-2 border-t border-border/50 min-h-[28px]",
          reserveSpace && "opacity-0",
          className
        )}
      >
        <div className="flex items-center gap-2 text-xs text-muted-foreground/50">
          <ClappingHandsIcon className="opacity-50" />
        </div>
        {commentCount > 0 && (
          <span className="text-xs text-muted-foreground">
            {commentCount} {commentCount === 1 ? 'comment' : 'comments'}
          </span>
        )}
      </div>
    );
  }

  // For owner's posts: hide entire footer if no applause AND no comments
  if (isOwner && applauseCount === 0 && commentCount === 0) {
    if (reserveSpace) {
      return <div className={cn("pt-2 mt-2 border-t border-border/50 min-h-[28px]", className)} />;
    }
    return null;
  }

  // Check if we should show anything
  const showApplause = applauseCount > 0 || !isOwner;
  const showComments = commentCount > 0;

  // If nothing to show, hide footer (or reserve space)
  if (!showApplause && !showComments) {
    if (reserveSpace) {
      return <div className={cn("pt-2 mt-2 border-t border-border/50 min-h-[28px]", className)} />;
    }
    return null;
  }

  return (
    <div 
      className={cn(
        "flex items-center justify-between pt-2 mt-2 border-t border-border/50 transition-opacity duration-300",
        reserveSpace && "animate-in fade-in duration-300",
        className
      )}
    >
      {/* Applause button/display area - left side */}
      {showApplause ? (
        <button
          type="button"
          onClick={handleToggleApplause}
          disabled={!profile || isOwner}
          className={cn(
            "flex items-center gap-2 text-xs transition-colors group text-muted-foreground",
            profile && !isOwner && "hover:text-foreground cursor-pointer",
            hasApplauded && "text-foreground"
          )}
        >
          {/* Applause icon */}
          <ClappingHandsIcon 
            className={cn(
              "transition-transform",
              profile && !isOwner && "group-hover:scale-110"
            )}
          />

          {/* Applause count and profile display */}
          {applauseCount > 0 ? (
            <span className="flex items-center gap-1.5">
              {/* First applauder's small avatar */}
              {firstApplauder && (
                <span className="flex -space-x-1" onClick={(e) => e.stopPropagation()}>
                  <ClickableAvatar
                    profileId={firstApplauder.id}
                    avatar={firstApplauder.avatar}
                    name={firstApplauder.name}
                    size="xs"
                    className="border border-background"
                  />
                  {/* Show second avatar if more than 1 */}
                  {applauseCount > 1 && applauseList[1]?.profile && (
                    <ClickableAvatar
                      profileId={applauseList[1].profile.id}
                      avatar={applauseList[1].profile.avatar}
                      name={applauseList[1].profile.name}
                      size="xs"
                      className="border border-background"
                    />
                  )}
                </span>
              )}
              <span>
                {applauseCount === 1 
                  ? `${firstApplauder?.name || '1'} gave applause`
                  : `${applauseCount} gave applause`
                }
              </span>
            </span>
          ) : (
            <span className="opacity-70">Give applause</span>
          )}
        </button>
      ) : (
        <div /> /* Empty spacer to maintain layout */
      )}

      {/* Comment count - right side */}
      {showComments && (
        <button
          type="button"
          onClick={handleCommentClick}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {commentCount} {commentCount === 1 ? 'comment' : 'comments'}
        </button>
      )}
    </div>
  );
});
