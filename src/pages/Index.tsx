import { useState, useMemo, useEffect, useRef } from 'react';
import { format, subMonths } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useNotes } from '@/hooks/useNotes';
import { useAcceptedNoteShares } from '@/hooks/useNoteShares';
import { useFeedProjects } from '@/hooks/useProjects';
import { useFeedGigs } from '@/hooks/usePromoPosts';
import { usePageViewTracking } from '@/hooks/usePageViewTracking';
import { useScrollRestoration } from '@/hooks/useScrollRestoration';
import { useShouldShowWeeklyGoalModal } from '@/hooks/useWeeklyGoal';
import { usePremium } from '@/contexts/PremiumContext';
import { usePracticeStats } from '@/hooks/usePracticeStats';
import { useAchievementToasts } from '@/hooks/useAchievementToasts';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

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
import { ThreeDayStreakDialog } from '@/components/ThreeDayStreakDialog';
import { SevenDayStreakDialog } from '@/components/SevenDayStreakDialog';
import { FeedbackPromptDialog } from '@/components/FeedbackPromptDialog';
import { ProUpsellDialog } from '@/components/ProUpsellDialog';
import { FeedItemCard, projectToFeedItem, gigToFeedItem, FeedItem } from '@/components/FeedItemCard';
import { ProTipsDialog } from '@/components/ProTipsDialog';
import { useProTips } from '@/hooks/useProTips';

const LOAD_MORE_COUNT = 10;

const Index = () => {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const { showOnboarding } = useOnboarding();
  const { isPremium, isLoading: premiumLoading } = usePremium();
  const { data: practiceStats } = usePracticeStats(profile?.id);
  
  // Show toast when user earns a new achievement
  useAchievementToasts(practiceStats ? {
    bestStreak: practiceStats.bestDailyStreak,
    totalNotes: practiceStats.totalNotesCount,
    totalHours: Math.floor(practiceStats.totalAllTimeMinutes / 60),
    bestMonthDays: practiceStats.bestMonthDays,
    bestCompletedYearPct: practiceStats.bestCompletedYearPct,
  } : undefined);
  
  // Track page views for analytics
  usePageViewTracking('practice');
  
  const { data: notes, isPending: notesLoading, isFetching: notesRefetching } = useNotes();
  const { data: acceptedSharedNotes } = useAcceptedNoteShares();
  const { data: feedProjects, isPending: projectsLoading } = useFeedProjects();
  const { data: feedGigs, isPending: gigsLoading } = useFeedGigs();
  
  // Combined loading state - wait for all data sources to be ready
  const isTimelineLoading = notesLoading || projectsLoading || gigsLoading;
  const isTimelineRefetching = notesRefetching;
  
  // Weekly goal modal state
  const { shouldShow: shouldShowWeeklyGoal, markAsShown } = useShouldShowWeeklyGoalModal(profile?.id);
  const [weeklyGoalModalOpen, setWeeklyGoalModalOpen] = useState(false);
  
  // Show weekly goal modal on Monday for premium users
  useEffect(() => {
    if (shouldShowWeeklyGoal && !weeklyGoalModalOpen) {
      setWeeklyGoalModalOpen(true);
    }
  }, [shouldShowWeeklyGoal]);

  // 3-day streak one-time popup
  const [threeDayDialogOpen, setThreeDayDialogOpen] = useState(false);
  const threeDayClaimingRef = useRef(false);

  // 7-day streak one-time popup
  const [sevenDayDialogOpen, setSevenDayDialogOpen] = useState(false);
  const sevenDayClaimingRef = useRef(false);

  // 20-note feedback prompt (one-time, localStorage-gated, no new queries)
  const [feedbackPromptOpen, setFeedbackPromptOpen] = useState(false);
  const feedbackPromptFiredRef = useRef(false);

   // 20-note pro upsell (one-time, localStorage-gated, free users only)
  const [proUpsellOpen, setProUpsellOpen] = useState(false);
  const proUpsellFiredRef = useRef(false);

  // Pro tips popup (every 8 logins, each tip once in lifetime)
  const { tipIndex, markTipShown } = useProTips(profile?.id);

  useEffect(() => {
    if (!profile || !practiceStats) return;
    const streak = practiceStats.currentStreak;
    const milestones = profile.celebrated_streak_milestones || [];

    // --- 3-day milestone ---
    if (streak >= 3 && !milestones.includes(3) && !threeDayClaimingRef.current) {
      threeDayClaimingRef.current = true;
      (async () => {
        const { data, error } = await supabase.rpc('claim_streak_milestone', {
          p_profile_id: profile.id,
          p_milestone: 3,
        });
        if (error) { threeDayClaimingRef.current = false; return; }
        const result = data as { claimed: boolean } | null;
        if (result?.claimed) {
          setThreeDayDialogOpen(true);
          await refreshProfile();
        }
      })();
    }

    // --- 7-day milestone ---
    if (streak >= 7 && !milestones.includes(7) && !sevenDayClaimingRef.current) {
      sevenDayClaimingRef.current = true;
      (async () => {
        const { data, error } = await supabase.rpc('claim_streak_milestone', {
          p_profile_id: profile.id,
          p_milestone: 7,
        });
        if (error) { sevenDayClaimingRef.current = false; return; }
        const result = data as { claimed: boolean } | null;
        if (result?.claimed) {
          setSevenDayDialogOpen(true);
          await refreshProfile();
        }
      })();
    }
  }, [practiceStats?.currentStreak, profile?.id, profile?.celebrated_streak_milestones, refreshProfile]);


  // Comprehensive bootstrapping detection: auth loading OR profile not yet available
  const isBootstrapping = authLoading || (!!user && !profile);
  const [searchQuery, setSearchQuery] = useState('');
  const [focusDateFilter, setFocusDateFilter] = useState<Date | undefined>(undefined);
  
  const { displayCount, setDisplayCount } = useScrollRestoration('index-feed', 10);
  
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

  // 20-note feedback prompt — uses profile flag (persisted in DB)
  const notesCount = allNotes.length;
  useEffect(() => {
    if (feedbackPromptFiredRef.current) return;
    if (!profile) return;
    if (profile.has_seen_feedback_prompt) return;
    if (notesCount >= 20) {
      feedbackPromptFiredRef.current = true;
      supabase.from('profiles').update({ has_seen_feedback_prompt: true }).eq('id', profile.id).then(() => {});
      setFeedbackPromptOpen(true);
    }
  }, [notesCount, profile]);

  // 20-note pro upsell — uses profile flag (persisted in DB, survives app updates)
  useEffect(() => {
    if (proUpsellFiredRef.current) return;
    if (premiumLoading) return;
    if (isPremium) return;
    if (!profile) return;
    if (profile.has_seen_pro_upsell) return;
    if (notesCount >= 20) {
      proUpsellFiredRef.current = true;
      // Persist in DB so it never shows again, even after app updates
      supabase.from('profiles').update({ has_seen_pro_upsell: true }).eq('id', profile.id).then(() => {});
      setProUpsellOpen(true);
    }
  }, [notesCount, isPremium, premiumLoading, profile]);

  // Convert projects and gigs to feed items
  const feedItems = useMemo(() => {
    const items: FeedItem[] = [];
    
    if (feedProjects) {
      items.push(...feedProjects.map(projectToFeedItem));
    }
    
    if (feedGigs) {
      items.push(...feedGigs.map(gigToFeedItem));
    }
    
    // Sort by created_at descending
    return items.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [feedProjects, feedGigs]);

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
      {/* Subtle musical decorations - desktop only */}
      <div className="hidden lg:block fixed inset-0 pointer-events-none overflow-hidden z-[5]">
        {/* Left cluster */}
        <div className="absolute top-[12%] left-3 opacity-[0.04] text-primary text-5xl rotate-[-15deg] select-none" aria-hidden="true">♪</div>
        <div className="absolute top-[28%] left-7 opacity-[0.03] text-primary text-3xl rotate-[10deg] select-none" aria-hidden="true">♫</div>
        <div className="absolute top-[45%] left-4 opacity-[0.04] text-primary text-4xl rotate-[-8deg] select-none" aria-hidden="true">𝄞</div>
        <div className="absolute top-[62%] left-8 opacity-[0.03] text-primary text-3xl rotate-[20deg] select-none" aria-hidden="true">♩</div>
        <div className="absolute top-[78%] left-2 opacity-[0.03] text-primary text-4xl rotate-[-12deg] select-none" aria-hidden="true">♭</div>

        {/* Right cluster */}
        <div className="absolute top-[15%] right-4 opacity-[0.04] text-primary text-4xl rotate-[12deg] select-none" aria-hidden="true">𝄢</div>
        <div className="absolute top-[32%] right-8 opacity-[0.03] text-primary text-5xl rotate-[-18deg] select-none" aria-hidden="true">♬</div>
        <div className="absolute top-[50%] right-3 opacity-[0.04] text-primary text-3xl rotate-[6deg] select-none" aria-hidden="true">♯</div>
        <div className="absolute top-[68%] right-10 opacity-[0.03] text-primary text-4xl rotate-[-10deg] select-none" aria-hidden="true">♪</div>
        <div className="absolute top-[82%] right-5 opacity-[0.03] text-primary text-3xl rotate-[15deg] select-none" aria-hidden="true">𝄞</div>

        {/* Decorative curved line - left */}
        <svg className="absolute top-[20%] left-0 w-28 h-64 opacity-[0.04]" viewBox="0 0 100 200" fill="none" aria-hidden="true">
          <path d="M80 0 C60 40, 20 60, 40 100 C60 140, 20 160, 30 200" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeLinecap="round" />
        </svg>

        {/* Decorative curved line - right */}
        <svg className="absolute top-[30%] right-0 w-28 h-64 opacity-[0.04]" viewBox="0 0 100 200" fill="none" aria-hidden="true">
          <path d="M20 0 C40 40, 80 60, 60 100 C40 140, 80 160, 70 200" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>

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
              {isBootstrapping ? (
                <>
                  {/* Skeleton placeholders that reserve space during auth bootstrapping */}
                  <div className="h-[60px] w-full rounded-lg bg-muted/30 animate-pulse" />
                  <div className="h-[60px] w-full rounded-lg bg-muted/30 animate-pulse" />
                  <div className="h-[120px] w-full rounded-lg bg-muted/30 animate-pulse" />
                </>
              ) : (
                <>
                  {/* Practice Controls (Collapsible) + Quick Note Capture - wrapped for tour */}
                  {/* These cards get elevated z-index during active session via SessionFocusOverlay context */}
                  <div data-tour="practice-capture" className="relative session-focus-card">
                    <PracticeControls />
                  </div>
                  <div className="session-focus-card">
                    <QuickNoteCapture />
                  </div>

                  {/* Ongoing Focus - Practice Routine */}
                  {profile && (
                    <div data-tour="practice-board" className="session-focus-card">
                      <TodaysFocus />
                    </div>
                  )}
                </>
              )}
            </section>
          </GlintProvider>

          {/* Memory Reminder */}
          <MemoryReminder />

          {/* Timeline */}
          <section data-tour="timeline">
            {/* Notes container with connected borders - includes header */}
            <div className="relative px-3 sm:px-4 border border-border rounded-lg bg-card z-10">
              
              {/* Header row inside the frame */}
              <div className="flex items-center gap-2 sm:gap-4 py-3">
                <h2 className="text-lg font-semibold shrink-0">Notes</h2>
                {/* Search hidden for now — keep code for potential re-enable */}
                {/* <div className="flex items-center gap-2 flex-1 min-w-0">
                  <TimelineSearch 
                    onSearch={setSearchQuery} 
                  />
                </div> */}
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
                  feedItems={feedItems}
                  loading={isTimelineLoading || (isBootstrapping && !showOnboarding)} 
                  isRefetching={isTimelineRefetching}
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
      
      {/* 3-day streak one-time celebration */}
      <ThreeDayStreakDialog
        open={threeDayDialogOpen}
        onOpenChange={setThreeDayDialogOpen}
      />

      {/* 7-day streak one-time celebration */}
      <SevenDayStreakDialog
        open={sevenDayDialogOpen}
        onOpenChange={setSevenDayDialogOpen}
      />

      {/* 20-note one-time pro upsell for free users */}
      <ProUpsellDialog
        open={proUpsellOpen}
        onOpenChange={setProUpsellOpen}
      />
      <FeedbackPromptDialog
        open={feedbackPromptOpen}
        onOpenChange={setFeedbackPromptOpen}
      />
      <ProTipsDialog tipIndex={tipIndex} onDismiss={markTipShown} />
    </PageLayout>
  );
};

export default Index;