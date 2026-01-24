import { memo, useMemo, useState, useEffect } from 'react';
import { NoteWithAuthor } from '@/types';
import { NoteCard } from './NoteCard';
import { Button } from '@/components/ui/button';
import { useSignedUrlPrefetch } from '@/hooks/useSignedUrlPrefetch';
import { Loader2, Music, Lock, Sparkles } from 'lucide-react';
import { usePremium } from '@/contexts/PremiumContext';
import { differenceInDays, parseISO } from 'date-fns';

interface TimelineProps {
  notes: NoteWithAuthor[];
  loading?: boolean;
  isRefetching?: boolean;
  displayCount: number;
  onLoadMore: () => void;
}

const LOAD_MORE_COUNT = 10;
const FREE_USER_DAYS_LIMIT = 14;

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

// History gate component for older notes
function OlderNotesGate({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <div className="relative rounded-lg border border-border bg-card/50 p-6 text-center">
      <div className="flex flex-col items-center gap-3">
        <div className="rounded-full bg-jazz-gold/10 p-3">
          <Lock className="h-6 w-6 text-jazz-gold" />
        </div>
        <p className="text-sm text-muted-foreground">
          Upgrade to Premium to access your full practice history
        </p>
        <Button 
          onClick={onUpgrade}
          variant="hero"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Try Premium for Free
        </Button>
      </div>
    </div>
  );
}

export const Timeline = memo(function Timeline({ notes, loading, isRefetching, displayCount, onLoadMore }: TimelineProps) {
  // ========================================
  // ALL HOOKS MUST BE CALLED BEFORE ANY EARLY RETURNS
  // React requires hooks to be called in the same order every render
  // ========================================
  
  const [showSlowMessage, setShowSlowMessage] = useState(false);
  const { isPremium, isLoading: isPremiumLoading, openPremiumDialog } = usePremium();
  
  // Separate notes into recent (last 14 days) and older
  const { olderNotesCount, displayedNotes } = useMemo(() => {
    const now = new Date();
    const allDisplayed = notes.slice(0, displayCount);
    
    // For premium users or while loading, show all notes
    if (isPremium || isPremiumLoading) {
      return {
        olderNotesCount: 0,
        displayedNotes: allDisplayed,
      };
    }
    
    // For Lite users, filter to last 14 days
    const recent: NoteWithAuthor[] = [];
    let olderCount = 0;
    
    for (const note of allDisplayed) {
      const noteDate = parseISO(note.created_at);
      const daysAgo = differenceInDays(now, noteDate);
      
      if (daysAgo <= FREE_USER_DAYS_LIMIT) {
        recent.push(note);
      } else {
        olderCount++;
      }
    }
    
    // Also count older notes not yet displayed
    const remainingNotes = notes.slice(displayCount);
    for (const note of remainingNotes) {
      const noteDate = parseISO(note.created_at);
      const daysAgo = differenceInDays(now, noteDate);
      if (daysAgo > FREE_USER_DAYS_LIMIT) {
        olderCount++;
      }
    }
    
    return {
      olderNotesCount: olderCount,
      displayedNotes: recent,
    };
  }, [notes, displayCount, isPremium, isPremiumLoading]);

  // Count total notes within free limit for comparison - MUST be before early returns
  const totalRecentNotesCount = useMemo(() => {
    if (isPremium || isPremiumLoading) return notes.length;
    const now = new Date();
    return notes.filter(n => {
      const daysAgo = differenceInDays(now, parseISO(n.created_at));
      return daysAgo <= FREE_USER_DAYS_LIMIT;
    }).length;
  }, [notes, isPremium, isPremiumLoading]);

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

  // ========================================
  // EARLY RETURNS - Safe now that all hooks are called above
  // ========================================

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
        <div className="w-14 h-14 mx-auto rounded-full bg-secondary/50 flex items-center justify-center mb-4">
          <Music className="w-7 h-7 text-muted-foreground" />
        </div>
        <p>No notes yet</p>
        <p className="text-sm mt-1">Start a practice session or capture a quick note!</p>
      </div>
    );
  }

  // ========================================
  // COMPUTED VALUES - Not hooks, safe after early returns
  // ========================================

  // For premium users, show load more based on total notes
  // For Lite users, show load more if there are more recent notes to load
  const hasMoreRecentToLoad = isPremium 
    ? displayCount < notes.length
    : displayedNotes.length < totalRecentNotesCount;

  // Only show the gate after all recent notes have been loaded
  const showOlderNotesGate = !isPremium && !isPremiumLoading && 
    olderNotesCount > 0 && 
    displayedNotes.length >= totalRecentNotesCount;

  return (
    <div className="space-y-4">
      {displayedNotes.map((note) => (
        <NoteCard key={note.id} note={note} />
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
