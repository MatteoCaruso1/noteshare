import { useAuth } from '@/hooks/useAuth';
import { useActiveSession } from '@/hooks/useSessions';
import { useNotes } from '@/hooks/useNotes';
import { BottomNav } from '@/components/BottomNav';
import { Timeline } from '@/components/Timeline';
import { ActiveSessionBanner } from '@/components/ActiveSessionBanner';
import { WelcomeHero } from '@/components/WelcomeHero';
import { MemoryReminder } from '@/components/MemoryReminder';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const Index = () => {
  const { user, profile, loading } = useAuth();
  const { data: activeSession } = useActiveSession();
  const { data: notes, isLoading: notesLoading } = useNotes();
  const navigate = useNavigate();

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

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold">Noteshare</h1>
              <p className="text-sm text-muted-foreground">
                Welcome back, {profile?.name?.split(' ')[0] || 'musician'}
              </p>
            </div>
            <Button
              onClick={() => navigate('/practice')}
              className="bg-gradient-primary text-primary-foreground shadow-glow"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Note
            </Button>
          </div>
        </div>
      </header>

      {/* Active Session Banner */}
      {activeSession && <ActiveSessionBanner session={activeSession} />}

      {/* Main Content */}
      <main className="container max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Memory Reminder */}
        <MemoryReminder />

        {/* Timeline */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Your Practice Journal</h2>
          <Timeline notes={notes || []} loading={notesLoading} />
        </section>
      </main>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
};

export default Index;
