import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { NoteWithAuthor } from '@/types';

export function usePublicNotes(profileId: string | undefined) {
  return useQuery({
    queryKey: ['public-notes', profileId],
    queryFn: async () => {
      if (!profileId) return [];
      
      const { data, error } = await supabase
        .from('notes')
        .select(`
          *,
          profiles!notes_author_id_fkey (*),
          practice_sessions!notes_session_id_fkey (*)
        `)
        .eq('author_id', profileId)
        .eq('visibility', 'friends')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      return data.map((note: any) => ({
        ...note,
        author: note.profiles,
        session: note.practice_sessions,
      })) as NoteWithAuthor[];
    },
    enabled: !!profileId,
  });
}
