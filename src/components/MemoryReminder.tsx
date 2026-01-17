import { memo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Clock, X } from 'lucide-react';
import { subWeeks, subMonths, differenceInDays } from 'date-fns';
import { NoteWithAuthor } from '@/types';
import { WaveformPlayer } from '@/components/WaveformPlayer';

const MEMORY_REFRESH_DAYS = 5;
const MIN_AGE_WEEKS = 2;
const MIN_REPEAT_MONTHS = 6;
const STORAGE_KEY_DISMISSED = 'noteshare-dismissed-memories';
const STORAGE_KEY_LAST_REFRESH = 'noteshare-memories-last-refresh';
const STORAGE_KEY_SHOWN_HISTORY = 'noteshare-memories-shown-history'; // {noteId: lastShownDate}
const STORAGE_KEY_CURRENT_MEMORY = 'noteshare-current-memory-id';

export const MemoryReminder = memo(function MemoryReminder() {
  const { profile } = useAuth();
  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    try {
      const dismissed = localStorage.getItem(STORAGE_KEY_DISMISSED);
      const currentMemory = localStorage.getItem(STORAGE_KEY_CURRENT_MEMORY);
      if (!currentMemory) return false;
      return dismissed === currentMemory;
    } catch {
      return false;
    }
  });

  // Check if we should refresh memories (every 5 days)
  const shouldRefresh = (): boolean => {
    try {
      const lastRefresh = localStorage.getItem(STORAGE_KEY_LAST_REFRESH);
      if (!lastRefresh) return true;
      const daysSinceRefresh = differenceInDays(new Date(), new Date(lastRefresh));
      return daysSinceRefresh >= MEMORY_REFRESH_DAYS;
    } catch {
      return true;
    }
  };

  const getShownHistory = (): Record<string, string> => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY_SHOWN_HISTORY) || '{}');
    } catch {
      return {};
    }
  };

  const { data: memory } = useQuery({
    queryKey: ['memories', profile?.id, shouldRefresh()],
    queryFn: async (): Promise<{ note: NoteWithAuthor; label: string } | null> => {
      if (!profile) return null;

      // If not time to refresh, return cached memory
      if (!shouldRefresh()) {
        const currentMemoryId = localStorage.getItem(STORAGE_KEY_CURRENT_MEMORY);
        if (!currentMemoryId) return null;

        const { data } = await supabase
          .from('notes')
          .select(`id, text_content, audio_files, created_at, author_id, profiles!notes_author_id_fkey (id, name, avatar)`)
          .eq('id', currentMemoryId)
          .maybeSingle();

        if (!data) return null;

        return {
          note: mapNoteData(data),
          label: getTimeLabel(new Date(data.created_at)),
        };
      }

      // Fetch new memory - notes at least 2 weeks old with audio
      const minDate = subWeeks(new Date(), MIN_AGE_WEEKS);
      
      const { data } = await supabase
        .from('notes')
        .select(`id, text_content, audio_files, created_at, author_id, profiles!notes_author_id_fkey (id, name, avatar)`)
        .eq('author_id', profile.id)
        .lt('created_at', minDate.toISOString())
        .not('audio_files', 'is', null)
        .order('created_at', { ascending: false })
        .limit(50); // Get a pool to filter from

      if (!data || data.length === 0) {
        localStorage.setItem(STORAGE_KEY_LAST_REFRESH, new Date().toISOString());
        localStorage.removeItem(STORAGE_KEY_CURRENT_MEMORY);
        return null;
      }

      // Filter: must have audio, not shown in last 6 months
      const shownHistory = getShownHistory();
      const sixMonthsAgo = subMonths(new Date(), MIN_REPEAT_MONTHS);

      const eligibleNotes = data.filter(note => {
        // Must have audio files
        if (!note.audio_files || note.audio_files.length === 0) return false;
        
        // Check if shown within last 6 months
        const lastShown = shownHistory[note.id];
        if (lastShown && new Date(lastShown) > sixMonthsAgo) return false;
        
        return true;
      });

      if (eligibleNotes.length === 0) {
        localStorage.setItem(STORAGE_KEY_LAST_REFRESH, new Date().toISOString());
        localStorage.removeItem(STORAGE_KEY_CURRENT_MEMORY);
        return null;
      }

      // Pick a random eligible note for variety
      const selectedNote = eligibleNotes[Math.floor(Math.random() * eligibleNotes.length)];

      // Update storage
      localStorage.setItem(STORAGE_KEY_LAST_REFRESH, new Date().toISOString());
      localStorage.setItem(STORAGE_KEY_CURRENT_MEMORY, selectedNote.id);
      localStorage.removeItem(STORAGE_KEY_DISMISSED);
      
      // Record this note as shown
      const newHistory = { ...shownHistory, [selectedNote.id]: new Date().toISOString() };
      localStorage.setItem(STORAGE_KEY_SHOWN_HISTORY, JSON.stringify(newHistory));

      return {
        note: mapNoteData(selectedNote),
        label: getTimeLabel(new Date(selectedNote.created_at)),
      };
    },
    enabled: !!profile,
    staleTime: 5 * 60 * 1000,
  });

  const handleDismiss = () => {
    if (memory?.note) {
      localStorage.setItem(STORAGE_KEY_DISMISSED, memory.note.id);
      setIsDismissed(true);
    }
  };

  if (!memory?.note || isDismissed) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Sparkles className="w-4 h-4 text-primary" />
        <span>Musical Memory</span>
      </div>
      <Card className="p-4 border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10 relative">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1 rounded-full hover:bg-background/50 transition-colors text-muted-foreground hover:text-foreground"
          aria-label="Dismiss memory"
        >
          <X className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="secondary" className="text-xs select-none cursor-default">
            <Clock className="w-3 h-3 mr-1" />
            {memory.label}
          </Badge>
        </div>
        {memory.note.text_content && (
          <p className="text-sm whitespace-pre-wrap pr-6">{memory.note.text_content}</p>
        )}
        {memory.note.audio_files && memory.note.audio_files.length > 0 && (
          <div className="mt-2">
            <WaveformPlayer src={memory.note.audio_files[0]} />
          </div>
        )}
      </Card>
    </div>
  );
});

function mapNoteData(noteData: any): NoteWithAuthor {
  return {
    ...noteData,
    author: noteData.profiles as any,
    tags: [],
    image_files: [],
    video_files: [],
    visibility: 'private' as const,
    updated_at: noteData.created_at,
    session_id: null,
    project_id: null,
    goal_id: null,
    gig_id: null,
    audio_file_names: null,
    comment_count: 0,
    focus_entry_id: null,
    focus_date: null,
    focus_text_snapshot: null,
  } as NoteWithAuthor;
}

function getTimeLabel(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffYears >= 1) return `${diffYears} year${diffYears > 1 ? 's' : ''} ago`;
  if (diffMonths >= 1) return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;
  if (diffWeeks >= 2) return `${diffWeeks} weeks ago`;
  return '2 weeks ago';
}