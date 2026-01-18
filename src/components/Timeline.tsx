import { memo, useMemo, useState, useEffect } from 'react';
import { NoteWithAuthor } from '@/types';
import { NoteCard } from './NoteCard';
import { Button } from '@/components/ui/button';
import { useSignedUrlPrefetch } from '@/hooks/useSignedUrlPrefetch';
import { Loader2 } from 'lucide-react';

interface TimelineProps {
  notes: NoteWithAuthor[];
  loading?: boolean;
  isRefetching?: boolean;
  displayCount: number;
  onLoadMore: () => void;
}

const LOAD_MORE_COUNT = 10;

// Loading skeleton component
const LoadingSkeleton = ({ message }: { message?: string }) => (
  <div className="space-y-4">
    {message && (
      <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <p className="text-sm">{message}</p>
      </div>
    )}
    {[1, 2, 3].map((i) => (
      <div key={i} className="h-32 bg-card rounded-lg animate-pulse" />
    ))}
  </div>
);

export const Timeline = memo(function Timeline({ notes, loading, isRefetching, displayCount, onLoadMore }: TimelineProps) {
  const [showSlowMessage, setShowSlowMessage] = useState(false);
  
  const displayedNotes = useMemo(() => 
    notes.slice(0, displayCount), 
    [notes, displayCount]
  );

  // Prefetch signed URLs for all displayed notes in a single batch
  useSignedUrlPrefetch(displayedNotes);
  
  // Track extended loading time for user feedback
  const isLoading = loading || isRefetching;
  
  useEffect(() => {
    if (isLoading && notes.length === 0) {
      // Show slow message after 5 seconds of loading with no data
      const timer = setTimeout(() => setShowSlowMessage(true), 5000);
      return () => clearTimeout(timer);
    }
    setShowSlowMessage(false);
  }, [isLoading, notes.length]);

  // If we have no notes and are loading, show informative skeleton
  if (notes.length === 0 && isLoading) {
    return (
      <LoadingSkeleton 
        message={showSlowMessage 
          ? "Still loading... This may take a moment on slower connections" 
          : "Loading your notes..."
        } 
      />
    );
  }

  // Only show empty state if we're definitely done loading and have no notes
  if (notes.length === 0 && !loading && !isRefetching) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No notes yet</p>
        <p className="text-sm mt-1">Start practicing to capture your first note!</p>
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
