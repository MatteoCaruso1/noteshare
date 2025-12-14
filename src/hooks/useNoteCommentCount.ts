import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useNoteCommentCount(noteId: string) {
  return useQuery({
    queryKey: ['note-comment-count', noteId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('note_comments')
        .select('*', { count: 'exact', head: true })
        .eq('note_id', noteId);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!noteId,
  });
}
