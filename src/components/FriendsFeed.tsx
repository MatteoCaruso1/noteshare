import { memo, useMemo, useEffect } from 'react';
import { useFriendsNotes, useFriends } from '@/hooks/useFriendships';
import { NoteCard } from './NoteCard';
import { FriendsFeedSkeleton } from './FriendsFeedSkeleton';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users } from 'lucide-react';
import { format } from 'date-fns';
import { useScrollRestoration } from '@/hooks/useScrollRestoration';
import { useQueryClient } from '@tanstack/react-query';

interface FriendsFeedProps {
  searchQuery?: string;
  focusDateFilter?: Date;
}

const LOAD_MORE_COUNT = 10;

export const FriendsFeed = memo(function FriendsFeed({ searchQuery = '', focusDateFilter }: FriendsFeedProps) {
  const { data: notes, isLoading } = useFriendsNotes();
  const { data: friends } = useFriends();
  const { displayCount, setDisplayCount } = useScrollRestoration('friends-feed', 10);
  const queryClient = useQueryClient();

  // Prefetch applause data for visible notes to prevent footer loading jank
  useEffect(() => {
    if (notes && notes.length > 0) {
      // Prefetch applause for the first batch of notes
      const notesToPrefetch = notes.slice(0, displayCount);
      notesToPrefetch.forEach(note => {
        // Only prefetch if not already in cache
        const existing = queryClient.getQueryData(['applause', note.id]);
        if (!existing) {
          queryClient.prefetchQuery({
            queryKey: ['applause', note.id],
            queryFn: async () => {
              const { supabase } = await import('@/integrations/supabase/client');
              const { data, error } = await supabase
                .from('applause')
                .select(`
                  id,
                  note_id,
                  user_id,
                  created_at,
                  profile:profiles!applause_user_id_fkey(id, name, avatar)
                `)
                .eq('note_id', note.id)
                .order('created_at', { ascending: true });

              if (error) throw error;
              return data || [];
            },
            staleTime: 30000,
          });
        }
      });
    }
  }, [notes, displayCount, queryClient]);

  // Calculate skeleton count based on friend count
  const skeletonCount = useMemo(() => {
    // If we know user has friends, show more skeletons
    if (friends && friends.length > 0) {
      return Math.min(friends.length * 2, 5); // At most 5 skeletons
    }
    return 3; // Default reasonable count
  }, [friends]);

  // Filter notes based on search query and focus date
  const filteredNotes = useMemo(() => {
    if (!notes) return [];
    
    let filtered = notes;
    
    // Filter by focus date if set
    if (focusDateFilter) {
      const filterDateStr = format(focusDateFilter, 'yyyy-MM-dd');
      filtered = filtered.filter((note) => note.focus_date === filterDateStr);
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((note) => {
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
    }
    
    return filtered;
  }, [notes, searchQuery, focusDateFilter]);

  const displayedNotes = useMemo(() => 
    filteredNotes.slice(0, displayCount),
    [filteredNotes, displayCount]
  );

  const hasMore = displayCount < filteredNotes.length;

  const handleLoadMore = () => {
    setDisplayCount(prev => prev + LOAD_MORE_COUNT);
  };

  if (isLoading) {
    return <FriendsFeedSkeleton count={skeletonCount} />;
  }

  if (!notes || notes.length === 0) {
    return (
      <Card className="p-8 bg-card border-border text-center">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Users className="w-8 h-8 text-white" />
          </div>
        </div>
        <h3 className="font-semibold text-lg mb-2">No friends' notes yet</h3>
        <p className="text-muted-foreground text-sm max-w-sm mx-auto">
          Add friends to see what they're practicing!
        </p>
      </Card>
    );
  }

  if ((searchQuery || focusDateFilter) && filteredNotes.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No results found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {displayedNotes.map((note) => (
        <NoteCard key={note.id} note={note} fromFriends />
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
