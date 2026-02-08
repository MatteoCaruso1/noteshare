import { memo, useMemo, useEffect } from 'react';
import { useFriendsNotes } from '@/hooks/useFriendships';
import { useFriendsFeedProjects } from '@/hooks/useProjects';
import { useFriendsFeedGigs } from '@/hooks/usePromoPosts';
import { NoteCard } from './NoteCard';
import { FeedItemCard, FeedItem } from './FeedItemCard';
import { FriendsFeedSkeleton } from './FriendsFeedSkeleton';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users } from 'lucide-react';
import { format } from 'date-fns';
import { useScrollRestoration } from '@/hooks/useScrollRestoration';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getCachedUrl, setCachedUrls } from '@/lib/signedUrlPersistentCache';

interface FriendsFeedProps {
  searchQuery?: string;
  focusDateFilter?: Date;
}

const LOAD_MORE_COUNT = 10;

/**
 * Extract storage path from avatar URL for caching
 */
function extractStoragePath(url: string): string | null {
  if (!url) return null;
  if (url.startsWith('blob:')) return null;
  if (!url.startsWith('http')) return url;
  
  try {
    const urlObj = new URL(url);
    if (!urlObj.pathname.includes('/storage/v1/object/')) {
      return null; // External URL like dicebear
    }
    const match = urlObj.pathname.match(/\/storage\/v1\/object\/(?:public\/|authenticated\/|sign\/)?([^/]+)\/(.+)/);
    if (match) {
      return decodeURIComponent(match[2]).split('?')[0];
    }
  } catch {
    // Not a valid URL
  }
  return null;
}

export const FriendsFeed = memo(function FriendsFeed({ searchQuery = '', focusDateFilter }: FriendsFeedProps) {
  const { data: notes, isLoading: notesLoading } = useFriendsNotes();
  const { data: feedProjects, isLoading: projectsLoading } = useFriendsFeedProjects();
  const { data: feedGigs, isLoading: gigsLoading } = useFriendsFeedGigs();
  const { displayCount, setDisplayCount } = useScrollRestoration('friends-feed', 10);
  const queryClient = useQueryClient();

  const isLoading = notesLoading || projectsLoading || gigsLoading;

  // Convert projects and gigs to FeedItem format
  const feedItems: FeedItem[] = useMemo(() => {
    const items: FeedItem[] = [];
    
    // Add projects
    if (feedProjects) {
      feedProjects.forEach((project: any) => {
        items.push({
          id: project.id,
          type: 'project',
          title: project.title,
          description: project.description,
          coverImage: project.cover_image,
          createdAt: project.created_at,
          owner: {
            id: project.owner?.id || project.owner_id,
            name: project.owner?.name || 'Unknown',
            avatar: project.owner?.avatar,
          },
        });
      });
    }
    
    // Add gigs
    if (feedGigs) {
      feedGigs.forEach((gig: any) => {
        items.push({
          id: gig.id,
          type: 'gig',
          title: gig.title,
          description: gig.description,
          coverImage: gig.image,
          eventDate: gig.event_date,
          createdAt: gig.created_at,
          owner: {
            id: gig.author?.id || gig.author_id,
            name: gig.author?.name || 'Unknown',
            avatar: gig.author?.avatar,
          },
        });
      });
    }
    
    return items;
  }, [feedProjects, feedGigs]);

  // Prefetch avatars in background - don't block rendering
  useEffect(() => {
    if (!notes || notes.length === 0) return;

    const prefetchAvatars = async () => {
      const avatarsToFetch: string[] = [];
      const seenPaths = new Set<string>();
      
      // Collect unique avatar paths from note authors
      for (const note of notes.slice(0, displayCount)) {
        if (!note.author?.avatar) continue;
        
        const avatarPath = extractStoragePath(note.author.avatar);
        if (!avatarPath || seenPaths.has(avatarPath)) continue;
        seenPaths.add(avatarPath);
        
        // Check if already cached
        const cached = await getCachedUrl(avatarPath);
        if (!cached) {
          avatarsToFetch.push(avatarPath);
        }
      }

      if (avatarsToFetch.length === 0) return;

      try {
        const { data, error } = await supabase.functions.invoke('get-signed-url', {
          body: { urls: avatarsToFetch, expiresInSeconds: 60 * 60 * 24 },
        });

        if (!error && data?.results) {
          const entries = avatarsToFetch
            .filter(path => data.results[path])
            .map(path => ({
              path,
              signedUrl: data.results[path],
              expiresAt: Date.now() + 23 * 60 * 60 * 1000,
              priority: 'avatar' as const,
            }));

          if (entries.length > 0) {
            await setCachedUrls(entries);
          }
        }
      } catch (err) {
        console.warn('[FriendsFeed] Failed to prefetch avatars:', err);
      }
    };

    prefetchAvatars();
  }, [notes, displayCount]);

  // Prefetch applause data for visible notes to prevent footer loading jank
  useEffect(() => {
    if (!notes || notes.length === 0) return;

    // Prefetch applause for the first batch of notes
    const notesToPrefetch = notes.slice(0, displayCount);
    notesToPrefetch.forEach(note => {
      // Only prefetch if not already in cache
      const existing = queryClient.getQueryData(['applause', note.id]);
      if (!existing) {
        queryClient.prefetchQuery({
          queryKey: ['applause', note.id],
          queryFn: async () => {
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
  }, [notes, displayCount, queryClient]);

  // Fixed skeleton count - don't wait for friends data to load
  const skeletonCount = 3;

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

  // Merge notes and feed items into a unified timeline sorted by date
  type TimelineItem = 
    | { type: 'note'; data: typeof filteredNotes[number]; createdAt: string }
    | { type: 'feedItem'; data: FeedItem; createdAt: string };

  const mergedTimeline = useMemo(() => {
    const items: TimelineItem[] = [];
    
    // Add notes
    filteredNotes.forEach(note => {
      items.push({ type: 'note', data: note, createdAt: note.created_at });
    });
    
    // Add feed items (projects and gigs with show_on_feed enabled)
    feedItems.forEach(item => {
      items.push({ type: 'feedItem', data: item, createdAt: item.createdAt });
    });
    
    // Sort by created_at descending (newest first)
    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return items;
  }, [filteredNotes, feedItems]);

  const displayedItems = useMemo(() => 
    mergedTimeline.slice(0, displayCount),
    [mergedTimeline, displayCount]
  );

  const hasMore = displayCount < mergedTimeline.length;

  const handleLoadMore = () => {
    setDisplayCount(prev => prev + LOAD_MORE_COUNT);
  };

  // Only show skeleton while data is loading - don't wait for avatars
  if (isLoading) {
    return <FriendsFeedSkeleton count={skeletonCount} />;
  }

  if (mergedTimeline.length === 0) {
    return (
      <Card className="p-8 bg-card border-border text-center">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Users className="w-8 h-8 text-white" />
          </div>
        </div>
        <h3 className="font-semibold text-lg mb-2">No friends' activity yet</h3>
        <p className="text-muted-foreground text-sm max-w-sm mx-auto">
          Add friends to see what they're practicing!
        </p>
      </Card>
    );
  }

  if ((searchQuery || focusDateFilter) && filteredNotes.length === 0 && feedItems.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No results found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {displayedItems.map((item) => (
        item.type === 'note' ? (
          <NoteCard key={`note-${item.data.id}`} note={item.data} fromFriends />
        ) : (
          <FeedItemCard key={`${item.data.type}-${item.data.id}`} item={item.data} />
        )
      ))}
      {hasMore && (
        <Button 
          variant="outline" 
          className="w-full" 
          onClick={handleLoadMore}
        >
          Load more ({mergedTimeline.length - displayCount} remaining)
        </Button>
      )}
    </div>
  );
});
