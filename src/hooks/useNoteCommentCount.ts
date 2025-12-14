import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useNoteCommentCount(noteId: string) {
  return useQuery({
    queryKey: ['note-comment-count', noteId],
    queryFn: async () => {
      const { data, count, error } = await supabase
        .from('note_comments')
        .select('id', { count: 'exact' })
        .eq('note_id', noteId);

      if (error) throw error;
      return count ?? data?.length ?? 0;
    },
    enabled: !!noteId,
  });
}
