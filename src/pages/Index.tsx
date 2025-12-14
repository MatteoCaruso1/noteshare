import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNotes } from '@/hooks/useNotes';
import { BottomNav } from '@/components/BottomNav';
import { Timeline } from '@/components/Timeline';
import { WelcomeHero } from '@/components/WelcomeHero';
import { MemoryReminder } from '@/components/MemoryReminder';
import { GoalsSection } from '@/components/GoalsSection';
import { QuickNoteCapture } from '@/components/QuickNoteCapture';
import { FeedProjects } from '@/components/FeedProjects';
import { FeedGigs } from '@/components/FeedGigs';
import { PracticeControls } from '@/components/PracticeControls';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Play, ChevronDown, ChevronRight } from 'lucide-react';

const PRACTICE_EXPANDED_KEY = 'noteshare_practice_expanded';

const Index = () => {
  const { user, profile, loading } = useAuth();
  const { data: notes, isLoading: notesLoading } = useNotes();

  // Practice section collapsible state - default collapsed
  const [isPracticeExpanded, setIsPracticeExpanded] = useState(() => {
    const stored = localStorage.getItem(PRACTICE_EXPANDED_KEY);
    return stored === 'true';
  });

  useEffect(() => {
    localStorage.setItem(PRACTICE_EXPANDED_KEY, String(isPracticeExpanded));
  }, [isPracticeExpanded]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <WelcomeHero />;
  }

  const firstName = profile?.name?.split(' ')[0] || 'Your';
  const notesTitle = `${firstName}'s Notes`;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Page Title */}
      <div className="container max-w-2xl mx-auto px-4 pt-4 pb-2">
        <h1 className="text-lg sm:text-xl font-semibold">{notesTitle}</h1>
      </div>

      {/* Main Content */}
      <main className="container max-w-2xl mx-auto px-4 py-4 space-y-4 sm:space-y-6">
        {/* Goals Section (Collapsible) */}
        {profile && <GoalsSection profileId={profile.id} />}

        {/* Practice Controls (Collapsible) */}
        <Card className="bg-card border-border">
          <Collapsible open={isPracticeExpanded} onOpenChange={setIsPracticeExpanded}>
            <CollapsibleTrigger asChild>
              <button className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors rounded-lg">
                <div className="flex items-center gap-2">
                  <Play className="w-5 h-5 text-primary" />
                  <h2 className="font-semibold">Practice Session</h2>
                </div>
                {isPracticeExpanded ? (
                  <ChevronDown className="w-5 h-5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                )}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-4 pb-4">
                <PracticeControls />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Quick Note Capture */}
        <QuickNoteCapture />

        {/* Feed Projects */}
        <FeedProjects />

        {/* Feed Gigs */}
        <FeedGigs />

        {/* Memory Reminder */}
        <MemoryReminder />

        {/* Timeline */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Timeline</h2>
          <Timeline notes={notes || []} loading={notesLoading} />
        </section>
      </main>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
};

export default Index;