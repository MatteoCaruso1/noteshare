import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { useNotes } from '@/hooks/useNotes';
import { useScrollRestoration } from '@/hooks/useScrollRestoration';
import { BottomNav } from '@/components/BottomNav';
import { PageLayout, PageHeader, PageBody } from '@/components/PageLayout';
import { Timeline } from '@/components/Timeline';
import { WelcomeHero } from '@/components/WelcomeHero';
import { MemoryReminder } from '@/components/MemoryReminder';
import { SimpleGoals } from '@/components/SimpleGoals';
import { QuickNoteCapture } from '@/components/QuickNoteCapture';
import { TodaysFocus } from '@/components/TodaysFocus';
import { PracticeControls } from '@/components/PracticeControls';
import { TimelineSearch } from '@/components/TimelineSearch';

const LOAD_MORE_COUNT = 10;

const Index = () => {
  const { user, profile, loading } = useAuth();
  const { data: notes, isLoading: notesLoading, isFetching: notesRefetching } = useNotes();
  const isNotesBootstrapping = !!user && !profile;
  const [searchQuery, setSearchQuery] = useState('');
  const [focusDateFilter, setFocusDateFilter] = useState<Date | undefined>(undefined);
  const [tagFilter, setTagFilter] = useState<string | undefined>(undefined);
  
  const { displayCount, setDisplayCount } = useScrollRestoration('index-timeline', 10);
  
  const handleLoadMore = () => {
    setDisplayCount(prev => prev + LOAD_MORE_COUNT);
  };

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
        <main className="container max-w-2xl mx-auto px-4 py-2 space-y-4 sm:space-y-6">
          {/* Simple Goals - always visible at top */}
          {profile && <SimpleGoals profileId={profile.id} />}

          {/* Practice Controls (Collapsible) */}
          <PracticeControls />

          {/* Quick Note Capture */}
          <QuickNoteCapture />

          {/* Today's Focus */}
          {profile && <TodaysFocus />}

          {/* Memory Reminder */}
          <MemoryReminder />

          {/* Timeline */}
          <section>
            <div className="flex items-center justify-between gap-4 mb-4">
              <h2 className="text-lg font-semibold">Notes</h2>
              <div className="flex items-center gap-2 flex-1 justify-end">
                <TimelineSearch 
                  onSearch={setSearchQuery} 
                  onFocusDateFilter={setFocusDateFilter}
                  focusDate={focusDateFilter}
                  onTagFilter={setTagFilter}
                  selectedTag={tagFilter}
                  availableTags={availableTags}
                />
              </div>
            </div>
            {(searchQuery || focusDateFilter || tagFilter) && (
              <p className="text-sm text-muted-foreground mb-3">
                {filteredNotes.length} result{filteredNotes.length !== 1 ? 's' : ''}
                {searchQuery && ` for "${searchQuery}"`}
                {tagFilter && ` tagged "${tagFilter}"`}
                {focusDateFilter && ` on ${format(focusDateFilter, 'MMM d, yyyy')}`}
              </p>
            )}
            <Timeline 
              notes={filteredNotes} 
              loading={notesLoading || isNotesBootstrapping} 
              isRefetching={notesRefetching}
              displayCount={displayCount}
              onLoadMore={handleLoadMore}
            />
          </section>
        </main>
      </PageBody>

      {/* Bottom Navigation */}
      <BottomNav />
    </PageLayout>
  );
};

export default Index;