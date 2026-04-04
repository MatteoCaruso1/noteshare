import { memo, useMemo, useEffect } from 'react';
import { useFriendsNotes } from '@/hooks/useFriendships';
import { useFriendsFeedProjects } from '@/hooks/useProjects';
import { useFriendsFeedGigs } from '@/hooks/usePromoPosts';
import { useMultiNoteApplause } from '@/hooks/useApplause';
import { getSignedUrls } from '@/hooks/useSignedUrl';
import { NoteCard } from './NoteCard';
import { FeedItemCard, FeedItem } from './FeedItemCard';
import { FriendsFeedSkeleton } from './FriendsFeedSkeleton';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users } from 'lucide-react';
import { format } from 'date-fns';
import { useScrollRestoration } from '@/hooks/useScrollRestoration';

interface FriendsFeedProps {
  searchQuery?: string;
  focusDateFilter?: Date;
}

const LOAD_MORE_COUNT = 10;

export const FriendsFeed = memo(function FriendsFeed({ searchQuery = '', focusDateFilter }: FriendsFeedProps) {
  const { data: notes, isPending: notesPending } = useFriendsNotes();
  const { data: feedProjects, isPending: projectsPending } = useFriendsFeedProjects();
  const { data: feedGigs, isPending: gigsPending } = useFriendsFeedGigs();
  const { displayCount, setDisplayCount } = useScrollRestoration('friends-feed', 10);

  const isFirstLoad = notes === undefined || feedProjects === undefined || feedGigs === undefined;
  const hasLoadedOnce = notes !== undefined && feedProjects !== undefined && feedGigs !== undefined;

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

  // Prefetch avatars via coalesced batch pipeline - no separate edge call
  useEffect(() => {
    if (!notes || notes.length === 0) return;

    const avatarUrls: string[] = [];
    const seen = new Set<string>();
    
    for (const note of notes.slice(0, displayCount)) {
      const avatar = note.author?.avatar;
      if (!avatar || seen.has(avatar)) continue;
      seen.add(avatar);
      avatarUrls.push(avatar);
    }

    if (avatarUrls.length > 0) {
      // Feeds into the coalesced batch - merges with other concurrent calls
      getSignedUrls(avatarUrls);
    }
  }, [notes, displayCount]);

  // No manual batchFetchApplause effect needed — useMultiNoteApplause handles it below

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

  // Batch-fetch applause for all displayed notes in a single query
  const displayedNoteIds = useMemo(() => 
    displayedItems
      .filter((item): item is typeof displayedItems[number] & { type: 'note' } => item.type === 'note')
      .map(item => item.data.id),
    [displayedItems]
  );
  const { data: applauseMap } = useMultiNoteApplause(displayedNoteIds);

  const hasMore = displayCount < mergedTimeline.length;

  const handleLoadMore = () => {
    setDisplayCount(prev => prev + LOAD_MORE_COUNT);
  };

  // Only show skeleton while data is loading - don't wait for avatars
  if (isFirstLoad) {
    return <FriendsFeedSkeleton count={skeletonCount} />;
  }

  if (mergedTimeline.length === 0 && hasLoadedOnce) {
    return (
      <div className="space-y-4">
        <Card className="p-8 bg-card border-border text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="w-8 h-8 text-white" />
            </div>
          </div>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto">
            Add friends to see what they're practicing!
          </p>
        </Card>
        <div>
          <p className="text-xs text-muted-foreground mb-3 text-center">Sample timeline</p>
          <div className="space-y-4 opacity-70 pointer-events-none">
            <img src={sampleQuickNote} alt="Sample quick note" className="w-full rounded-lg" />
            <img src={samplePracticeSession} alt="Sample practice session" className="w-full rounded-lg" />
          </div>
        </div>
      </div>
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
          <NoteCard key={`note-${item.data.id}`} note={item.data} fromFriends applauseData={applauseMap?.get(item.data.id)} />
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
