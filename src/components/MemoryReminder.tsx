import { memo, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Clock, X } from 'lucide-react';
import { subMonths, subYears, differenceInDays } from 'date-fns';
import { NoteWithAuthor } from '@/types';
import { WaveformPlayer } from '@/components/WaveformPlayer';

const MEMORY_REFRESH_DAYS = 5;
const STORAGE_KEY_DISMISSED = 'noteshare-dismissed-memories';
const STORAGE_KEY_LAST_REFRESH = 'noteshare-memories-last-refresh';
const STORAGE_KEY_CACHED_IDS = 'noteshare-memories-cached-ids';

export const MemoryReminder = memo(function MemoryReminder() {
  const { profile } = useAuth();
  const [dismissedIds, setDismissedIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY_DISMISSED) || '[]');
    } catch {
      return [];
    }
  });

  // Check if we should refresh memories (every 5 days)
  const shouldRefresh = () => {
    try {
      const lastRefresh = localStorage.getItem(STORAGE_KEY_LAST_REFRESH);
      if (!lastRefresh) return true;
      const daysSinceRefresh = differenceInDays(new Date(), new Date(lastRefresh));
      return daysSinceRefresh >= MEMORY_REFRESH_DAYS;
    } catch {
      return true;
    }
  };

  const { data: memories } = useQuery({
    queryKey: ['memories', profile?.id, shouldRefresh()],
    queryFn: async () => {
      if (!profile) return [];

      // Check if we should use cached memories
      if (!shouldRefresh()) {
        const cachedIds = localStorage.getItem(STORAGE_KEY_CACHED_IDS);
        if (cachedIds) {
          const ids = JSON.parse(cachedIds);
          if (ids.length === 0) return [];
          
          // Fetch the cached notes
          const { data } = await supabase
            .from('notes')
            .select(`id, text_content, audio_files, created_at, author_id, profiles!notes_author_id_fkey (id, name, avatar)`)
            .eq('author_id', profile.id)
            .in('id', ids);
          
          if (!data) return [];
          
          return data.map(noteData => ({
            note: {
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
            } as NoteWithAuthor,
            label: getTimeLabel(new Date(noteData.created_at)),
          }));
        }
      }

      const now = new Date();
      const oneYearAgo = subYears(now, 1);
      const sixMonthsAgo = subMonths(now, 6);
      const oneMonthAgo = subMonths(now, 1);

      const dateRanges = [
        { label: '1 year ago', date: oneYearAgo },
        { label: '6 months ago', date: sixMonthsAgo },
        { label: '1 month ago', date: oneMonthAgo },
      ];

      const orConditions = dateRanges.map(range => {
        const startDate = new Date(range.date);
        startDate.setDate(startDate.getDate() - 2);
        const endDate = new Date(range.date);
        endDate.setDate(endDate.getDate() + 2);
        return `and(created_at.gte.${startDate.toISOString()},created_at.lte.${endDate.toISOString()})`;
      }).join(',');

      const { data } = await supabase
        .from('notes')
        .select(`id, text_content, audio_files, created_at, author_id, profiles!notes_author_id_fkey (id, name, avatar)`)
        .eq('author_id', profile.id)
        .or(orConditions)
        .order('created_at', { ascending: false })
        .limit(3);

      if (!data || data.length === 0) {
        localStorage.setItem(STORAGE_KEY_LAST_REFRESH, new Date().toISOString());
        localStorage.setItem(STORAGE_KEY_CACHED_IDS, '[]');
        return [];
      }

      // Cache the IDs and update refresh date
      localStorage.setItem(STORAGE_KEY_LAST_REFRESH, new Date().toISOString());
      localStorage.setItem(STORAGE_KEY_CACHED_IDS, JSON.stringify(data.map(n => n.id)));
      // Clear dismissed IDs on refresh since we have new memories
      localStorage.setItem(STORAGE_KEY_DISMISSED, '[]');
      setDismissedIds([]);

      const memories: Array<{ note: NoteWithAuthor; label: string }> = [];
      
      for (const noteData of data) {
        const noteDate = new Date(noteData.created_at);
        
        for (const range of dateRanges) {
          const startDate = new Date(range.date);
          startDate.setDate(startDate.getDate() - 2);
          const endDate = new Date(range.date);
          endDate.setDate(endDate.getDate() + 2);
          
          if (noteDate >= startDate && noteDate <= endDate) {
            if (!memories.find(m => m.label === range.label)) {
              memories.push({
                note: { 
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
                } as NoteWithAuthor,
                label: range.label,
              });
            }
            break;
          }
        }
      }

      return memories;
    },
    enabled: !!profile,
    staleTime: 5 * 60 * 1000,
  });

  const handleDismiss = (noteId: string) => {
    const newDismissed = [...dismissedIds, noteId];
    setDismissedIds(newDismissed);
    localStorage.setItem(STORAGE_KEY_DISMISSED, JSON.stringify(newDismissed));
  };

  const visibleMemories = memories?.filter(m => !dismissedIds.includes(m.note.id)) || [];

  if (visibleMemories.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Sparkles className="w-4 h-4 text-primary" />
        <span>Musical Memories</span>
      </div>
      {visibleMemories.map(({ note, label }) => (
        <Card key={note.id} className="p-4 border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10 relative">
          <button
            onClick={() => handleDismiss(note.id)}
            className="absolute top-2 right-2 p-1 rounded-full hover:bg-background/50 transition-colors text-muted-foreground hover:text-foreground"
            aria-label="Dismiss memory"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="secondary" className="text-xs select-none cursor-default">
              <Clock className="w-3 h-3 mr-1" />
              {label}
            </Badge>
          </div>
          {note.text_content && (
            <p className="text-sm whitespace-pre-wrap pr-6">{note.text_content}</p>
          )}
          {note.audio_files && note.audio_files.length > 0 && (
            <div className="mt-2">
              <WaveformPlayer src={note.audio_files[0]} />
            </div>
          )}
        </Card>
      ))}
    </div>
  );
});

function getTimeLabel(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays >= 335 && diffDays <= 395) return '1 year ago';
  if (diffDays >= 165 && diffDays <= 195) return '6 months ago';
  if (diffDays >= 28 && diffDays <= 34) return '1 month ago';
  return `${Math.floor(diffDays / 30)} months ago`;
}