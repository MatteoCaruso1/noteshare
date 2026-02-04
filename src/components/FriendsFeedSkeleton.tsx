import { memo } from 'react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface FriendsFeedSkeletonProps {
  /** Number of skeleton cards to show */
  count?: number;
}

/**
 * A skeleton loader for the friends feed that reserves proper space
 * for all card elements including the footer, preventing layout shifts.
 * Cards appear with a staggered fade-in animation for polish.
 */
export const FriendsFeedSkeleton = memo(function FriendsFeedSkeleton({ 
  count = 3 
}: FriendsFeedSkeletonProps) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <FriendNoteCardSkeleton key={i} index={i} />
      ))}
    </div>
  );
});

interface FriendNoteCardSkeletonProps {
  index?: number;
}

/**
 * Individual skeleton card that matches the exact layout of a NoteCard
 * including space reserved for the ApplauseFooter to prevent expansion.
 */
const FriendNoteCardSkeleton = memo(function FriendNoteCardSkeleton({ 
  index = 0 
}: FriendNoteCardSkeletonProps) {
  // Stagger delay: 80ms per card for smooth cascade effect
  const staggerDelay = index * 80;
  
  return (
    <Card 
      className="p-3 sm:p-4 bg-background border border-border rounded-lg animate-fade-in opacity-0"
      style={{ 
        animationDelay: `${staggerDelay}ms`,
        animationFillMode: 'forwards'
      }}
    >
      {/* Type Badge Row */}
      <div className="flex items-center gap-2 mb-3">
        <Skeleton className="h-5 w-28 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>

      {/* Author info with avatar */}
      <div className="flex items-center gap-3 mb-3">
        <Skeleton className="h-10 w-10 rounded-full shrink-0" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>

      {/* Text content - variable height simulation */}
      <div className="space-y-2 mb-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-3/4" />
      </div>

      {/* Audio waveform placeholder */}
      <Skeleton className="h-12 w-full rounded-lg mb-3" />

      {/* Footer with applause and comments - ALWAYS reserve space */}
      <div className="flex items-center justify-between pt-2 mt-2 border-t border-border/50">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-4 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-4 w-16" />
      </div>
    </Card>
  );
});
