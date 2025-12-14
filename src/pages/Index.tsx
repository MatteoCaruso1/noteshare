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

const Index = () => {
  const { user, profile, loading } = useAuth();
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
    <div className="min-h-screen bg-background pb-20">
      {/* Page Title */}
      <div className="container max-w-2xl mx-auto px-4 pt-4 pb-2">
        <h1 className="text-lg sm:text-xl font-semibold">{journalTitle}</h1>
      </div>

      {/* Main Content */}
      <main className="container max-w-2xl mx-auto px-4 py-4 space-y-4 sm:space-y-6">
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