import { memo, useCallback, useMemo } from 'react';
import { useNoteApplause, useGiveApplause, useRemoveApplause } from '@/hooks/useApplause';
import { useAuth } from '@/hooks/useAuth';
import { ClickableAvatar } from '@/components/ClickableAvatar';
import { cn } from '@/lib/utils';

interface ApplauseFooterProps {
  noteId: string;
  noteAuthorId: string;
  className?: string;
}

export const ApplauseFooter = memo(function ApplauseFooter({ 
  noteId, 
  noteAuthorId,
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
  const count = applauseList.length;

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

  // Don't render anything if loading
  if (isLoading) return null;

  // Always render the applause row (clickable area), even when count is 0
  return (
    <div 
      className={cn(
        "flex items-center gap-2 pt-2 mt-2 border-t border-border/50",
        className
      )}
    >
      {/* Applause button/display area */}
      <button
        type="button"
        onClick={handleToggleApplause}
        disabled={!profile || isOwner}
        className={cn(
          "flex items-center gap-2 text-xs transition-colors group",
          profile && !isOwner 
            ? "hover:text-primary cursor-pointer" 
            : "cursor-default",
          hasApplauded ? "text-primary" : "text-muted-foreground"
        )}
      >
        {/* Clapping hands emoji as applause icon */}
        <span 
          className={cn(
            "text-base transition-transform",
            profile && !isOwner && "group-hover:scale-110"
          )}
          role="img" 
          aria-label="applause"
        >
          👏
        </span>

        {/* Applause count and profile display */}
        {count > 0 ? (
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
                {count > 1 && applauseList[1]?.profile && (
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
              {count === 1 
                ? `${firstApplauder?.name || '1'} gave applause`
                : `${count} gave applause`
              }
            </span>
          </span>
        ) : (
          <span className="opacity-70">
            {profile && !isOwner ? 'Give applause' : 'No applause yet'}
          </span>
        )}
      </button>
    </div>
  );
});
