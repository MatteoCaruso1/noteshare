import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { useNotes } from '@/hooks/useNotes';
import { useAcceptedNoteShares } from '@/hooks/useNoteShares';
import { usePageViewTracking } from '@/hooks/usePageViewTracking';
import { useScrollRestoration } from '@/hooks/useScrollRestoration';
import { useShouldShowWeeklyGoalModal } from '@/hooks/useWeeklyGoal';
import { usePremium } from '@/contexts/PremiumContext';

import { PageLayout, PageHeader, PageBody } from '@/components/PageLayout';
import { Timeline } from '@/components/Timeline';
import { WelcomeHero } from '@/components/WelcomeHero';
import { MemoryReminder } from '@/components/MemoryReminder';
import { QuickNoteCapture } from '@/components/QuickNoteCapture';
import { TodaysFocus } from '@/components/TodaysFocus';
import { PracticeControls } from '@/components/PracticeControls';
import { TimelineSearch } from '@/components/TimelineSearch';
import { SessionFocusOverlay } from '@/components/SessionFocusOverlay';
import { GlintProvider } from '@/contexts/GlintContext';
import { WeeklyGoalModal } from '@/components/WeeklyGoalModal';

// Delay before showing MemoryReminder to allow Practice Board to stabilize
const MEMORY_RENDER_DELAY_MS = 0;

const LOAD_MORE_COUNT = 10;

const Index = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const { isPremium } = usePremium();
  
  // Track page views for analytics
  usePageViewTracking('practice');
  
  const { data: notes, isLoading: notesLoading, isFetching: notesRefetching } = useNotes();
  const { data: acceptedSharedNotes } = useAcceptedNoteShares();
  
  // Weekly goal modal state
  const { shouldShow: shouldShowWeeklyGoal, markAsShown } = useShouldShowWeeklyGoalModal(profile?.id, isPremium);
  const [weeklyGoalModalOpen, setWeeklyGoalModalOpen] = useState(false);
  
  // Show weekly goal modal on Monday for premium users
  useEffect(() => {
    if (shouldShowWeeklyGoal && !weeklyGoalModalOpen) {
      setWeeklyGoalModalOpen(true);
    }
  }, [shouldShowWeeklyGoal]);
  
  // Comprehensive bootstrapping detection: auth loading OR profile not yet available
  const isBootstrapping = authLoading || (!!user && !profile);
  const [searchQuery, setSearchQuery] = useState('');
  const [focusDateFilter, setFocusDateFilter] = useState<Date | undefined>(undefined);
  
  const { displayCount, setDisplayCount } = useScrollRestoration('index-feed', 10);
  
  // Track when Practice Board layout is stable for MemoryReminder positioning
  const [memoryReady, setMemoryReady] = useState(false);
  const practiceBoardRef = useRef<HTMLDivElement>(null);
  
  // Delay MemoryReminder render until Practice Board has had time to expand
  // This prevents the "jump" glitch when returning to the page
  useEffect(() => {
    // Reset on route entry (when user navigates back to practice page)
    setMemoryReady(false);
    
    // Wait for Practice Board to stabilize before showing memory
    const timer = setTimeout(() => {
      setMemoryReady(true);
    }, MEMORY_RENDER_DELAY_MS);
    
    return () => clearTimeout(timer);
  }, []); // Only run on mount
  
  const handleLoadMore = () => {
    setDisplayCount(prev => prev + LOAD_MORE_COUNT);
  };

  // Note: Onboarding is now triggered immediately in Auth.tsx after signup
  // This avoids the delay from waiting for profile to load

  // Merge own notes with accepted shared notes, sorted by creation date
  const allNotes = useMemo(() => {
    const ownNotes = notes || [];
    const sharedNotes = acceptedSharedNotes || [];
    
    // Create a Set of own note IDs to avoid duplicates
    const ownNoteIds = new Set(ownNotes.map(n => n.id));
    
    // Filter shared notes to only include those not already in own notes
    const uniqueSharedNotes = sharedNotes.filter(n => !ownNoteIds.has(n.id));
    
    // Merge and sort by created_at descending
    return [...ownNotes, ...uniqueSharedNotes].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [notes, acceptedSharedNotes]);

  // Filter notes based on search query, date, and tag
  const filteredNotes = useMemo(() => {
    if (!allNotes.length) return [];
    
    let filtered = allNotes;
    
    // Filter by creation date
    if (focusDateFilter) {
      const filterDateStr = format(focusDateFilter, 'yyyy-MM-dd');
      filtered = filtered.filter((note) => {
        const noteDate = format(new Date(note.created_at), 'yyyy-MM-dd');
        return noteDate === filterDateStr;
      });
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
        return false;
      });
    }
    
    return filtered;
  }, [allNotes, searchQuery, focusDateFilter]);

  if (authLoading) {
    return <div className="min-h-screen bg-background" />;
  }

  if (!user) {
    return <WelcomeHero />;
  }


  return (
    <PageLayout>
      {/* Page Title */}
      <PageHeader>
        <div className="container max-w-2xl mx-auto px-4 pt-4 pb-2">
          <div className="flex items-center justify-between h-9">
            <h1 className="text-lg sm:text-xl font-semibold">My Practice</h1>
          </div>
        </div>
      </PageHeader>

      {/* Main Content */}
      <PageBody>
        <main className="container max-w-2xl mx-auto px-4 py-2 space-y-4">
          {/* Practice Controls and Quick Note Capture wrapped in GlintProvider */}
          <GlintProvider>
            {/* Session Focus Overlay - darkens page during active sessions */}
            <SessionFocusOverlay />
            
            {/* Wrap focus cards in section for CSS targeting - session-focus-section for :has() fallback */}
            <section className="space-y-4 session-focus-section">
              {/* Practice Controls (Collapsible) + Quick Note Capture - wrapped for tour */}
              {/* These cards get elevated z-index during active session via SessionFocusOverlay context */}
              <div data-tour="practice-capture" className="relative session-focus-card">
                <PracticeControls />
              </div>
              <div className="session-focus-card">
                <QuickNoteCapture />
              </div>

              {/* Ongoing Focus - Practice Board */}
              {profile && (
                <div ref={practiceBoardRef} data-tour="practice-board" className="session-focus-card">
                  <TodaysFocus />
                </div>
              )}
            </section>
          </GlintProvider>

          {/* Memory Reminder - delayed render to wait for Practice Board to stabilize */}
          {memoryReady && <MemoryReminder />}

          {/* Timeline */}
          <section data-tour="timeline">
            {/* Notes container with connected borders - includes header */}
            <div className="relative px-3 sm:px-4 border border-border rounded-lg bg-card z-10">
              
              {/* Header row inside the frame */}
              <div className="flex items-center gap-2 sm:gap-4 py-3">
                <h2 className="text-lg font-semibold shrink-0">Notes</h2>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <TimelineSearch 
                    onSearch={setSearchQuery} 
                  />
                </div>
              </div>
              
              {(searchQuery || focusDateFilter) && (
                <p className="text-sm text-muted-foreground pb-3">
                  {filteredNotes.length} result{filteredNotes.length !== 1 ? 's' : ''}
                  {searchQuery && ` for "${searchQuery}"`}
                  {focusDateFilter && ` on ${format(focusDateFilter, 'MMM d, yyyy')}`}
                </p>
              )}
              
              <div className="pb-3 sm:pb-4">
                <Timeline
                  notes={filteredNotes} 
                  loading={notesLoading || isBootstrapping} 
                  isRefetching={notesRefetching}
                  displayCount={displayCount}
                  onLoadMore={handleLoadMore}
                />
              </div>
            </div>
          </section>
        </main>
      </PageBody>
      
      {/* Weekly Goal Modal - shows on Monday for premium users */}
      <WeeklyGoalModal 
        open={weeklyGoalModalOpen}
        onOpenChange={setWeeklyGoalModalOpen}
        onComplete={markAsShown}
      />
    </PageLayout>
  );
};

export default Index;