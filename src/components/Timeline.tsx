import { memo, useMemo } from 'react';
import { NoteWithAuthor } from '@/types';
import { NoteCard } from './NoteCard';
import { Button } from '@/components/ui/button';

interface TimelineProps {
  notes: NoteWithAuthor[];
  loading?: boolean;
  displayCount: number;
  onLoadMore: () => void;
}

const LOAD_MORE_COUNT = 10;

export const Timeline = memo(function Timeline({ notes, loading, displayCount, onLoadMore }: TimelineProps) {
  const displayedNotes = useMemo(() => 
    notes.slice(0, displayCount), 
    [notes, displayCount]
  );

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-card rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No notes yet. Start practicing to capture your first note!</p>
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
