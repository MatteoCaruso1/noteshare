import { useAuth } from '@/hooks/useAuth';
import { useActiveSession } from '@/hooks/useSessions';
import { useNotes } from '@/hooks/useNotes';
import { BottomNav } from '@/components/BottomNav';
import { Timeline } from '@/components/Timeline';
import { WelcomeHero } from '@/components/WelcomeHero';
import { MemoryReminder } from '@/components/MemoryReminder';
import { GoalsSection } from '@/components/GoalsSection';
import { QuickNoteCapture } from '@/components/QuickNoteCapture';
import { FeedProjects } from '@/components/FeedProjects';
import { FeedGigs } from '@/components/FeedGigs';

const Index = () => {
  const { user, profile, loading } = useAuth();
  const { data: activeSession } = useActiveSession();
  const { data: notes, isLoading: notesLoading } = useNotes();

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
  const journalTitle = `${firstName}'s Practice Journal`;

  return (
    <div className={`min-h-screen bg-background pb-20 ${activeSession ? 'pt-10' : ''}`}>
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border" style={{ top: activeSession ? '40px' : '0' }}>
        <div className="container max-w-2xl mx-auto px-4 py-4">
          <h1 className="text-xl font-semibold">{journalTitle}</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Goals Section */}
        {profile && <GoalsSection profileId={profile.id} />}

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