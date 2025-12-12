import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Clock } from 'lucide-react';
import { format, subMonths, subYears, differenceInDays } from 'date-fns';
import { NoteWithAuthor } from '@/types';

export function MemoryReminder() {
  const { profile } = useAuth();

  const { data: memories } = useQuery({
    queryKey: ['memories', profile?.id],
    queryFn: async () => {
      if (!profile) return [];

      const now = new Date();
      const oneYearAgo = subYears(now, 1);
      const sixMonthsAgo = subMonths(now, 6);
      const oneMonthAgo = subMonths(now, 1);

      // Get notes from around these dates (within 3 days)
      const dateRanges = [
        { label: '1 year ago', date: oneYearAgo, color: 'text-purple-400' },
        { label: '6 months ago', date: sixMonthsAgo, color: 'text-blue-400' },
        { label: '1 month ago', date: oneMonthAgo, color: 'text-teal-400' },
      ];

      const memories: Array<{ note: NoteWithAuthor; label: string; color: string }> = [];

      for (const range of dateRanges) {
        const startDate = new Date(range.date);
        startDate.setDate(startDate.getDate() - 2);
        const endDate = new Date(range.date);
        endDate.setDate(endDate.getDate() + 2);

        const { data } = await supabase
          .from('notes')
          .select(`*, profiles!notes_author_id_fkey (*)`)
          .eq('author_id', profile.id)
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString())
          .order('created_at', { ascending: false })
          .limit(1);

        if (data && data.length > 0) {
          memories.push({
            note: { ...data[0], author: data[0].profiles } as NoteWithAuthor,
            label: range.label,
            color: range.color,
          });
        }
      }

      return memories;
    },
    enabled: !!profile,
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
          {note.audio_files.length > 0 && (
            <div className="mt-2">
              <audio src={note.audio_files[0]} controls className="w-full h-8" />
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
