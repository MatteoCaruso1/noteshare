import { memo, useMemo } from 'react';
import { NoteWithAuthor } from '@/types';
import { NoteCard } from './NoteCard';
import { Button } from '@/components/ui/button';
import { useSignedUrlPrefetch } from '@/hooks/useSignedUrlPrefetch';

interface TimelineProps {
  notes: NoteWithAuthor[];
  loading?: boolean;
  isRefetching?: boolean;
  displayCount: number;
  onLoadMore: () => void;
}

const LOAD_MORE_COUNT = 10;

export const Timeline = memo(function Timeline({ notes, loading, isRefetching, displayCount, onLoadMore }: TimelineProps) {
  const displayedNotes = useMemo(() => 
    notes.slice(0, displayCount), 
    [notes, displayCount]
  );

  // Prefetch signed URLs for all displayed notes in a single batch
  useSignedUrlPrefetch(displayedNotes);

  // Show skeleton only on initial load, not during refetch
  if (loading && notes.length === 0) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-card rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  // Only show empty state if we're definitely done loading and have no notes
  // Don't show if we're refetching (might just be slow network)
  if (notes.length === 0 && !loading && !isRefetching) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No notes</p>
      </div>
    );
  }

  // If we have no notes but are still loading/refetching, show skeleton
  if (notes.length === 0) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-card rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  const hasMore = displayCount < notes.length;

  return (
    <div className="space-y-4">
      {displayedNotes.map((note) => (
        <NoteCard key={note.id} note={note} />
      ))}
      {hasMore && (
        <Button 
          variant="outline" 
          className="w-full" 
          onClick={onLoadMore}
        >
          Load more ({notes.length - displayCount} remaining)
        </Button>
      )}
    </div>
  );
});

export { LOAD_MORE_COUNT };
