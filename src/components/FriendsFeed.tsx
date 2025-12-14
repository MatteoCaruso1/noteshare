import { memo, useMemo, useState } from 'react';
import { useFriendsNotes } from '@/hooks/useFriendships';
import { NoteCard } from './NoteCard';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Sparkles } from 'lucide-react';

interface FriendsFeedProps {
  searchQuery?: string;
}

const INITIAL_LIMIT = 10;
const LOAD_MORE_COUNT = 10;

export const FriendsFeed = memo(function FriendsFeed({ searchQuery = '' }: FriendsFeedProps) {
  const { data: notes, isLoading } = useFriendsNotes();
  const [displayCount, setDisplayCount] = useState(INITIAL_LIMIT);

  // Filter notes based on search query
  const filteredNotes = useMemo(() => {
    if (!notes || !searchQuery.trim()) return notes || [];
    
    const query = searchQuery.toLowerCase();
    return notes.filter((note) => {
      // Search by text content
      if (note.text_content?.toLowerCase().includes(query)) return true;
      // Search by tags
      if (note.tags.some(tag => tag.toLowerCase().includes(query))) return true;
      // Search by audio file names
      if (note.audio_file_names?.some(name => name?.toLowerCase().includes(query))) return true;
      // Search by author name
      if (note.author?.name?.toLowerCase().includes(query)) return true;
      return false;
    });
  }, [notes, searchQuery]);

  const displayedNotes = useMemo(() => 
    filteredNotes.slice(0, displayCount),
    [filteredNotes, displayCount]
  );

  const hasMore = displayCount < filteredNotes.length;

  const handleLoadMore = () => {
    setDisplayCount(prev => prev + LOAD_MORE_COUNT);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-4 bg-card border-border animate-pulse">
            <div className="h-20 bg-muted rounded" />
          </Card>
        ))}
      </div>
    );
  }

  if (!notes || notes.length === 0) {
    return (
      <Card className="p-8 bg-card border-border text-center">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Users className="w-8 h-8 text-primary" />
          </div>
        </div>
        <h3 className="font-semibold text-lg mb-2">No friends' notes yet</h3>
        <p className="text-muted-foreground text-sm max-w-sm mx-auto">
          Add a few friends to see their practice journals here. This isn't about going viral — it's about improving together.
        </p>
        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Sparkles className="w-4 h-4 text-primary" />
          <span>Use the search above to find musicians</span>
        </div>
      </Card>
    );
  }

  if (searchQuery && filteredNotes.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No results for "{searchQuery}"</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {displayedNotes.map((note) => (
        <NoteCard key={note.id} note={note} />
      ))}
      {hasMore && (
        <Button 
          variant="outline" 
          className="w-full" 
          onClick={handleLoadMore}
        >
          Load more ({filteredNotes.length - displayCount} remaining)
        </Button>
      )}
    </div>
  );
});
