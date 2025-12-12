import { NoteWithAuthor } from '@/types';
import { NoteCard } from './NoteCard';

interface TimelineProps {
  notes: NoteWithAuthor[];
  loading?: boolean;
}

export function Timeline({ notes, loading }: TimelineProps) {
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

  return (
    <div className="space-y-4">
      {notes.map((note) => (
        <NoteCard key={note.id} note={note} />
      ))}
    </div>
  );
}
