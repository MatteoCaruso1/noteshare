import { memo, useMemo, useState, useEffect, useRef } from 'react';
import { NoteWithAuthor } from '@/types';
import { NoteCard } from './NoteCard';
import { NoteCardSkeleton } from './NoteCardSkeleton';
import { FeedItemCard, FeedItem } from './FeedItemCard';
import { Button } from '@/components/ui/button';
import { useSignedUrlPrefetch } from '@/hooks/useSignedUrlPrefetch';
import { Loader2, Music, Lock, Sparkles } from 'lucide-react';
import { usePremium } from '@/contexts/PremiumContext';

interface TimelineProps {
  notes: NoteWithAuthor[];
  feedItems?: FeedItem[];
  loading?: boolean;
  isRefetching?: boolean;
  displayCount: number;
  onLoadMore: () => void;
}

const LOAD_MORE_COUNT = 10;

type UIMode = 'loading' | 'empty' | 'list';

// Stable empty/loading shell - always maintains consistent height
function EmptyStateShell({ 
  uiMode, 
  showSkeleton,
  showSlowMessage,
  showLoadingText
}: { 
  uiMode: 'loading' | 'empty';
  showSkeleton: boolean;
  showSlowMessage: boolean;
  showLoadingText: boolean;
}) {
  return (
    <div className="min-h-[180px] flex flex-col">
      {/* Loading state with skeleton - show immediately */}
      <div 
        className={`w-full transition-opacity duration-200 ease-in-out ${
          uiMode === 'loading' ? 'opacity-100' : 'opacity-0 absolute pointer-events-none'
        }`}
      >
        <div className="space-y-4">
          {showSlowMessage && (
            <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <p className="text-sm">Still loading... This may take a moment on slower connections</p>
            </div>
          )}
          {[0, 1, 2].map((i) => (
            <NoteCardSkeleton key={i} index={i} />
          ))}
        </div>
      </div>
      
      {/* Empty state */}
      <div 
        className={`text-center text-muted-foreground transition-opacity duration-200 ${
          uiMode === 'empty' ? 'opacity-100' : 'opacity-0 absolute pointer-events-none'
        }`}
      >
        <div className="w-14 h-14 rounded-full bg-secondary/50 flex items-center justify-center mb-4 mx-auto">
          <Music className="w-7 h-7 text-muted-foreground" />
        </div>
        <p>No notes yet</p>
        <p className="text-sm mt-1">Start a practice session or capture a quick note!</p>
      </div>
    </div>
  );
}

// History gate component for older notes
function OlderNotesGate({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <div className="relative rounded-lg border border-border bg-card/50 p-6 text-center">
      <div className="flex flex-col items-center gap-3">
        <div className="rounded-full bg-jazz-gold/10 p-3">
          <Lock className="h-6 w-6 text-jazz-gold" />
        </div>
        <p className="text-sm text-muted-foreground">
          Upgrade to Pro to access your full practice history
        </p>
        <Button 
          onClick={onUpgrade}
          variant="hero"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Get Noteshare Pro
        </Button>
      </div>
    </div>
  );
}

export const Timeline = memo(function Timeline({ notes, feedItems = [], loading, isRefetching, displayCount, onLoadMore }: TimelineProps) {
  // ========================================
  // ALL HOOKS MUST BE CALLED BEFORE ANY EARLY RETURNS
  // ========================================
  
  const { isPremium, isLoading: isPremiumLoading, openPremiumDialog } = usePremium();
  
  // Build a single unified list of all items sorted by date FIRST, then paginate
  type TimelineItem = 
    | { type: 'note'; data: NoteWithAuthor; sortDate: number }
    | { type: 'feedItem'; data: FeedItem; sortDate: number };

  const allItemsSorted = useMemo(() => {
    const items: TimelineItem[] = [];
    
    notes.forEach(note => {
      items.push({ type: 'note', data: note, sortDate: new Date(note.created_at).getTime() });
    });
    
    feedItems.forEach(feedItem => {
      items.push({ type: 'feedItem', data: feedItem, sortDate: new Date(feedItem.createdAt).getTime() });
    });
    
    // Sort by date descending
    return items.sort((a, b) => b.sortDate - a.sortDate);
  }, [notes, feedItems]);

  // Paginate the unified list
  const displayedItems = useMemo(() => {
    return allItemsSorted.slice(0, displayCount);
  }, [allItemsSorted, displayCount]);
  
  // Check if we have any content
  const hasContent = allItemsSorted.length > 0;
  
  // UI Mode state machine to prevent flickering
  const [uiMode, setUiMode] = useState<UIMode>(() => {
    if (hasContent && !loading && !isRefetching) return 'list';
    return loading || isRefetching ? 'loading' : 'empty';
  });
  
  // Track if skeleton should be visible (delay to prevent flash on quick loads)
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [showSlowMessage, setShowSlowMessage] = useState(false);
  const [showLoadingText, setShowLoadingText] = useState(false);
  
  // Refs for debounce timers
  const emptyDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skeletonMinTimeRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skeletonShownAtRef = useRef<number | null>(null);
  
  const isLoading = loading || isRefetching;
  
  // State machine effect - handles transitions with debouncing
  // CRITICAL: Distinguish between initial load and background refetch.
  // During initial load (loading=true), stay in loading state even if partial content arrived.
  // During background refetch (only isRefetching), keep showing existing content.
  useEffect(() => {
    if (emptyDebounceRef.current) {
      clearTimeout(emptyDebounceRef.current);
      emptyDebounceRef.current = null;
    }
    
    // During initial load, keep showing loading state until ALL sources are ready
    // This prevents folders/gigs from popping in after notes render
    if (loading) {
      setUiMode('loading');
      return;
    }
    
    // If we have content and we're not in initial loading, stay in list mode
    // (background refetches should not cause timeline to flicker)
    if (hasContent) {
      setUiMode('list');
      setShowSkeleton(false);
      setShowSlowMessage(false);
      setShowLoadingText(false);
      skeletonShownAtRef.current = null;
      return;
    }
    
    // No content scenarios
    if (isLoading) {
      setUiMode('loading');
    } else {
      const minSkeletonTime = 400;
      const emptyDebounceTime = 200;
      
      if (skeletonShownAtRef.current && showSkeleton) {
        const elapsed = Date.now() - skeletonShownAtRef.current;
        const remaining = Math.max(0, minSkeletonTime - elapsed);
        
        emptyDebounceRef.current = setTimeout(() => {
          setUiMode('empty');
          setShowSkeleton(false);
          setShowSlowMessage(false);
          skeletonShownAtRef.current = null;
        }, remaining + emptyDebounceTime);
      } else {
        emptyDebounceRef.current = setTimeout(() => {
          setUiMode('empty');
        }, emptyDebounceTime);
      }
    }
    
    return () => {
      if (emptyDebounceRef.current) {
        clearTimeout(emptyDebounceRef.current);
      }
    };
  }, [hasContent, isLoading, loading, showSkeleton]);
  
  // Skeleton display timer - show immediately, slow message after delay
  useEffect(() => {
    if (uiMode === 'loading' && !showSkeleton) {
      // Show skeleton immediately to avoid blank space
      setShowSkeleton(true);
      skeletonShownAtRef.current = Date.now();

      const slowMessageTimer = setTimeout(() => {
        setShowSlowMessage(true);
      }, 5000);
      
      return () => {
        clearTimeout(slowMessageTimer);
      };
    }
  }, [uiMode, showSkeleton]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (emptyDebounceRef.current) clearTimeout(emptyDebounceRef.current);
      if (skeletonMinTimeRef.current) clearTimeout(skeletonMinTimeRef.current);
    };
  }, []);
  
  // Extract displayed notes for URL prefetch
  const displayedNotes = useMemo(() => {
    return displayedItems
      .filter((item): item is TimelineItem & { type: 'note' } => item.type === 'note')
      .map(item => item.data);
  }, [displayedItems]);

  // Prefetch signed URLs for all displayed notes in a single batch
  useSignedUrlPrefetch(displayedNotes);

  // ========================================
  // RENDER
  // ========================================

  if (uiMode === 'loading' || uiMode === 'empty') {
    return (
      <EmptyStateShell 
        uiMode={uiMode} 
        showSkeleton={showSkeleton}
        showSlowMessage={showSlowMessage}
        showLoadingText={showLoadingText}
      />
    );
  }

  const hasMoreToLoad = displayCount < allItemsSorted.length;

  return (
    <div className="space-y-4">
      {displayedItems.map((item) => (
        item.type === 'note' ? (
          <NoteCard key={`note-${item.data.id}`} note={item.data} />
        ) : (
          <FeedItemCard key={`feed-${item.data.id}`} item={item.data} />
        )
      ))}
      
      {hasMoreToLoad && (
        <Button 
          variant="outline" 
          className="w-full" 
          onClick={onLoadMore}
        >
          Load more
        </Button>
      )}
    </div>
  );
});

export { LOAD_MORE_COUNT };
