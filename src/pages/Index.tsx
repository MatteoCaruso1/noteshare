import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { useNotes } from '@/hooks/useNotes';
import { BottomNav } from '@/components/BottomNav';
import { Timeline } from '@/components/Timeline';
import { WelcomeHero } from '@/components/WelcomeHero';
import { MemoryReminder } from '@/components/MemoryReminder';
import { GoalsSection } from '@/components/GoalsSection';
import { QuickNoteCapture } from '@/components/QuickNoteCapture';
import { TodaysFocus } from '@/components/TodaysFocus';
// FeedProjectsGigs hidden from Home - component preserved for reversibility
// import { FeedProjectsGigs } from '@/components/FeedProjectsGigs';
import { PracticeControls } from '@/components/PracticeControls';
import { TimelineSearch } from '@/components/TimelineSearch';
import { Card } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Play, ChevronDown, ChevronRight } from 'lucide-react';

const PRACTICE_EXPANDED_KEY = 'noteshare_practice_expanded';

const Index = () => {
  const { user, profile, loading } = useAuth();
  const { data: notes, isLoading: notesLoading } = useNotes();
  const [searchQuery, setSearchQuery] = useState('');
  const [focusDateFilter, setFocusDateFilter] = useState<Date | undefined>(undefined);
  const [tagFilter, setTagFilter] = useState<string | undefined>(undefined);

  // Practice section collapsible state - default collapsed
  const [isPracticeExpanded, setIsPracticeExpanded] = useState(() => {
    const stored = localStorage.getItem(PRACTICE_EXPANDED_KEY);
    return stored === 'true';
  });

  useEffect(() => {
    localStorage.setItem(PRACTICE_EXPANDED_KEY, String(isPracticeExpanded));
  }, [isPracticeExpanded]);

  // Collect all unique tags from notes
  const availableTags = useMemo(() => {
    if (!notes) return [];
    const tagSet = new Set<string>();
    notes.forEach(note => {
      note.tags.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [notes]);

  // Filter notes based on search query, date, and tag
  const filteredNotes = useMemo(() => {
    if (!notes) return [];
    
    let filtered = notes;
    
    // Filter by creation date
    if (focusDateFilter) {
      const filterDateStr = format(focusDateFilter, 'yyyy-MM-dd');
      filtered = filtered.filter((note) => {
        const noteDate = format(new Date(note.created_at), 'yyyy-MM-dd');
        return noteDate === filterDateStr;
      });
    }
    
    // Filter by tag
    if (tagFilter) {
      filtered = filtered.filter((note) => note.tags.includes(tagFilter));
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
  }, [notes, searchQuery, focusDateFilter, tagFilter]);

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
  const timelineTitle = `${firstName}'s Notes`;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Page Title */}
      <div className="container max-w-2xl mx-auto px-4 pt-4 pb-2">
        <h1 className="text-lg sm:text-xl font-semibold">My Practice</h1>
      </div>

      {/* Main Content */}
      <main className="container max-w-2xl mx-auto px-4 py-4 space-y-4 sm:space-y-6">
        {/* Goals Section (Collapsible) */}
        {profile && <GoalsSection profileId={profile.id} />}

        {/* Projects & Gigs hidden from Home - pages still accessible via navigation */}
        {/* <FeedProjectsGigs /> */}

        {/* Practice Controls (Collapsible) */}
        <Card className="bg-card border-border">
          <Collapsible open={isPracticeExpanded} onOpenChange={setIsPracticeExpanded}>
            <CollapsibleTrigger asChild>
              <button className="w-full p-4 flex items-center justify-between transition-colors rounded-lg group">
                <div className="flex items-center gap-2">
                  <Play className={`w-5 h-5 transition-colors ${isPracticeExpanded ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`} />
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

        {/* Today's Focus */}
        {profile && <TodaysFocus />}

        {/* Memory Reminder */}
        <MemoryReminder />

        {/* Timeline */}
        <section>
          <div className="space-y-3 mb-4">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold">{timelineTitle}</h2>
            </div>
            <TimelineSearch 
              onSearch={setSearchQuery} 
              onFocusDateFilter={setFocusDateFilter}
              focusDate={focusDateFilter}
              onTagFilter={setTagFilter}
              selectedTag={tagFilter}
              availableTags={availableTags}
            />
          </div>
          {(searchQuery || focusDateFilter || tagFilter) && (
            <p className="text-sm text-muted-foreground mb-3">
              {filteredNotes.length} result{filteredNotes.length !== 1 ? 's' : ''}
              {searchQuery && ` for "${searchQuery}"`}
              {tagFilter && ` tagged "${tagFilter}"`}
              {focusDateFilter && ` on ${format(focusDateFilter, 'MMM d, yyyy')}`}
            </p>
          )}
          <Timeline notes={filteredNotes} loading={notesLoading} />
        </section>
      </main>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
};

export default Index;