import { memo, lazy, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Clock } from 'lucide-react';
import { format, subMonths, subYears } from 'date-fns';
import { NoteWithAuthor } from '@/types';

// Lazy load WaveformPlayer
const WaveformPlayer = lazy(() => import('@/components/WaveformPlayer').then(m => ({ default: m.WaveformPlayer })));

const WaveformFallback = () => (
  <div className="h-14 bg-secondary/50 rounded-lg animate-pulse" />
);

export const MemoryReminder = memo(function MemoryReminder() {
  const { profile } = useAuth();

  const { data: memories } = useQuery({
    queryKey: ['memories', profile?.id],
    queryFn: async () => {
      if (!profile) return [];

      const now = new Date();
      const oneYearAgo = subYears(now, 1);
      const sixMonthsAgo = subMonths(now, 6);
      const oneMonthAgo = subMonths(now, 1);

      // Build date ranges for batched query
      const dateRanges = [
        { label: '1 year ago', date: oneYearAgo, color: 'text-purple-400' },
        { label: '6 months ago', date: sixMonthsAgo, color: 'text-blue-400' },
        { label: '1 month ago', date: oneMonthAgo, color: 'text-teal-400' },
      ];

      // Build OR conditions for a single batched query instead of 3 separate queries
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

      if (!data || data.length === 0) return [];

      // Map notes to their time periods
      const memories: Array<{ note: NoteWithAuthor; label: string; color: string }> = [];
      
      for (const noteData of data) {
        const noteDate = new Date(noteData.created_at);
        
        // Determine which time period this note belongs to
        for (const range of dateRanges) {
          const startDate = new Date(range.date);
          startDate.setDate(startDate.getDate() - 2);
          const endDate = new Date(range.date);
          endDate.setDate(endDate.getDate() + 2);
          
          if (noteDate >= startDate && noteDate <= endDate) {
            // Check if we already have a note for this period
            if (!memories.find(m => m.label === range.label)) {
              memories.push({
                note: { 
                  ...noteData, 
                  author: noteData.profiles as any,
                  // Provide defaults for required fields
                  tags: [],
                  image_files: [],
                  video_files: [],
                  visibility: 'private' as const,
                  updated_at: noteData.created_at,
                  session_id: null,
                  project_id: null,
                  gig_id: null,
                  audio_file_names: null,
                } as NoteWithAuthor,
                label: range.label,
                color: range.color,
              });
            }
            break;
          }
        }
      }

      return memories;
    },
    enabled: !!profile,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  if (!memories || memories.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Sparkles className="w-4 h-4 text-primary" />
        <span>Musical Memories</span>
      </div>
      {memories.map(({ note, label, color }) => (
        <Card key={note.id} className="p-4 bg-gradient-card border-border">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className={`text-xs ${color}`}>
              <Clock className="w-3 h-3 mr-1" />
              {label}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {format(new Date(note.created_at), 'MMM d, yyyy')}
            </span>
          </div>
          {note.text_content && (
            <p className="text-sm line-clamp-2">{note.text_content}</p>
          )}
          {note.audio_files && note.audio_files.length > 0 && (
            <div className="mt-2">
              <Suspense fallback={<WaveformFallback />}>
                <WaveformPlayer src={note.audio_files[0]} />
              </Suspense>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
});
