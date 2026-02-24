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
}

export const ApplauseFooter = memo(function ApplauseFooter({ 
  noteId, 
  noteAuthorId,
  commentCount = 0,
  onCommentClick,
  className 
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

  // Determine visibility
  const showApplause = applauseCount > 0 || !isOwner;
  const showComments = commentCount > 0;
  const shouldExpand = !isLoading && (showApplause || showComments);

  // For owner's posts with no applause and no comments, render nothing
  if (!isLoading && isOwner && applauseCount === 0 && commentCount === 0) return null;
  // If nothing to show at all, render nothing
  if (!isLoading && !showApplause && !showComments) return null;

  return (
    <div
      className={cn("grid transition-[grid-template-rows] duration-300 ease-out", className)}
      style={{ gridTemplateRows: shouldExpand ? '1fr' : '0fr' }}
    >
      <div className="overflow-hidden">
        <div className="flex items-center justify-between pt-2 mt-2 border-t border-border/50">
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
              <ClappingHandsIcon 
                className={cn(
                  "transition-transform",
                  profile && !isOwner && "group-hover:scale-110"
                )}
              />
              {applauseCount > 0 ? (
                <span className="flex items-center gap-1.5">
                  {firstApplauder && (
                    <span className="flex -space-x-1" onClick={(e) => e.stopPropagation()}>
                      <ClickableAvatar
                        profileId={firstApplauder.id}
                        avatar={firstApplauder.avatar}
                        name={firstApplauder.name}
                        size="xs"
                        className="border border-background"
                      />
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
            <div />
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
      </div>
    </div>
  );
});
