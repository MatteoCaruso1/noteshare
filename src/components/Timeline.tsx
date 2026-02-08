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
  showSlowMessage 
}: { 
  uiMode: 'loading' | 'empty';
  showSkeleton: boolean;
  showSlowMessage: boolean;
}) {
  return (
    <div className="min-h-[180px] flex flex-col items-center justify-center">
      {/* Loading state with skeleton */}
      <div 
        className={`w-full transition-opacity duration-200 ${
          uiMode === 'loading' && showSkeleton ? 'opacity-100' : 'opacity-0 absolute pointer-events-none'
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
  
  // Check if we have any content (notes or feed items)
  const hasContent = notes.length > 0 || feedItems.length > 0;
  
  // UI Mode state machine to prevent flickering
  const [uiMode, setUiMode] = useState<UIMode>(() => {
    if (hasContent) return 'list';
    return loading || isRefetching ? 'loading' : 'empty';
  });
  
  // Track if skeleton should be visible (delay to prevent flash on quick loads)
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [showSlowMessage, setShowSlowMessage] = useState(false);
  
  // Refs for debounce timers
  const emptyDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skeletonMinTimeRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skeletonShownAtRef = useRef<number | null>(null);
  
  const isLoading = loading || isRefetching;
  
  // State machine effect - handles transitions with debouncing
  useEffect(() => {
    // Clear any pending empty transition when state changes
    if (emptyDebounceRef.current) {
      clearTimeout(emptyDebounceRef.current);
      emptyDebounceRef.current = null;
    }
    
    // If we have any content (notes or feed items), immediately switch to list mode
    if (hasContent) {
      setUiMode('list');
      setShowSkeleton(false);
      setShowSlowMessage(false);
      skeletonShownAtRef.current = null;
      return;
    }
    
    // No notes - determine if loading or empty
    if (isLoading) {
      setUiMode('loading');
      // Don't reset skeleton timers here - they're managed separately
    } else {
      // Loading finished with no notes - debounce transition to empty
      // This prevents brief "empty" flashes during refetch cycles
      const minSkeletonTime = 400; // ms
      const emptyDebounceTime = 200; // ms
      
      // If skeleton was shown, ensure it stays for minimum time
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
        // No skeleton was shown, just debounce the empty transition
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
  }, [hasContent, isLoading, showSkeleton]);
  
  // Skeleton display timer - show after delay to prevent flash
  useEffect(() => {
    if (uiMode === 'loading' && !showSkeleton) {
      const skeletonDelayTimer = setTimeout(() => {
        setShowSkeleton(true);
        skeletonShownAtRef.current = Date.now();
      }, 300);
      
      const slowMessageTimer = setTimeout(() => {
        setShowSlowMessage(true);
      }, 5000);
      
      return () => {
        clearTimeout(skeletonDelayTimer);
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
  
  // Separate notes into recent (last 14 days) and older
  // DISABLED: Free users now have full history access
  const { olderNotesCount, displayedNotes } = useMemo(() => {
    const allDisplayed = notes.slice(0, displayCount);
    
    // All users now have access to full history
    return {
      olderNotesCount: 0,
      displayedNotes: allDisplayed,
    };
  }, [notes, displayCount]);

  // Merge notes and feed items into a unified timeline
  type TimelineItem = 
    | { type: 'note'; data: NoteWithAuthor }
    | { type: 'feedItem'; data: FeedItem };

  const mergedTimeline = useMemo(() => {
    const items: TimelineItem[] = [];
    
    // Add notes
    displayedNotes.forEach(note => {
      items.push({ type: 'note', data: note });
    });
    
    // Add feed items
    feedItems.forEach(feedItem => {
      items.push({ type: 'feedItem', data: feedItem });
    });
    
    // Sort by date descending
    return items.sort((a, b) => {
      const dateA = a.type === 'note' ? new Date(a.data.created_at) : new Date(a.data.createdAt);
      const dateB = b.type === 'note' ? new Date(b.data.created_at) : new Date(b.data.createdAt);
      return dateB.getTime() - dateA.getTime();
    });
  }, [displayedNotes, feedItems]);

  // Count total notes within free limit for comparison
  const totalRecentNotesCount = useMemo(() => {
    return notes.length;
  }, [notes]);

  // Prefetch signed URLs for all displayed notes in a single batch
  useSignedUrlPrefetch(displayedNotes);

  // ========================================
  // RENDER - Single stable structure
  // ========================================

  // Render empty/loading shell when no notes
  if (uiMode === 'loading' || uiMode === 'empty') {
    return (
      <EmptyStateShell 
        uiMode={uiMode} 
        showSkeleton={showSkeleton}
        showSlowMessage={showSlowMessage}
      />
    );
  }

  // List mode - render notes
  const hasMoreRecentToLoad = isPremium 
    ? displayCount < notes.length
    : displayedNotes.length < totalRecentNotesCount;

  const showOlderNotesGate = !isPremium && !isPremiumLoading && 
    olderNotesCount > 0 && 
    displayedNotes.length >= totalRecentNotesCount;

  return (
    <div className="space-y-4">
      {mergedTimeline.map((item) => (
        item.type === 'note' ? (
          <NoteCard key={`note-${item.data.id}`} note={item.data} />
        ) : (
          <FeedItemCard key={`feed-${item.data.id}`} item={item.data} />
        )
      ))}
      
      {/* Load more button - show if there are more recent notes to load */}
      {hasMoreRecentToLoad && (
        <Button 
          variant="outline" 
          className="w-full" 
          onClick={onLoadMore}
        >
          Load more
        </Button>
      )}
      
      {/* Show upgrade prompt for older notes after all recent notes are loaded */}
      {showOlderNotesGate && (
        <OlderNotesGate onUpgrade={openPremiumDialog} />
      )}
    </div>
  );
});

export { LOAD_MORE_COUNT };
