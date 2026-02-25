import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface Applause {
  id: string;
  note_id: string;
  user_id: string;
  created_at: string;
}

export interface ApplauseWithProfile extends Applause {
  profile: {
    id: string;
    name: string;
    avatar: string | null;
  } | null;
}

/**
 * Fetch applause for a single note.
 * Prefer using batchFetchApplause (from useNotes) for lists —
 * this hook is only for individual note detail pages or footers
 * where the cache was already seeded by batchFetchApplause.
 */
export function useNoteApplause(noteId: string) {
  return useQuery({
    queryKey: ['applause', noteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('applause')
        .select(`
          id,
          note_id,
          user_id,
          created_at,
          profile:profiles!applause_user_id_fkey(id, name, avatar)
        `)
        .eq('note_id', noteId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data || []) as unknown as ApplauseWithProfile[];
    },
    staleTime: 30000,
  });
}

/**
 * Fetch applause for multiple notes in a single query.
 * Used by timeline pages to avoid N+1 applause queries.
 * Results are seeded into the per-note ['applause', noteId] cache.
 */
export function useMultiNoteApplause(noteIds: string[]) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['applause-batch', noteIds.sort().join(',')],
    queryFn: async () => {
      if (noteIds.length === 0) return new Map<string, ApplauseWithProfile[]>();

      const { data, error } = await supabase
        .from('applause')
        .select(`
          id,
          note_id,
          user_id,
          created_at,
          profile:profiles!applause_user_id_fkey(id, name, avatar)
        `)
        .in('note_id', noteIds)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const map = new Map<string, ApplauseWithProfile[]>();
      // Initialize all noteIds with empty arrays so we cache "no applause" too
      noteIds.forEach(id => map.set(id, []));
      (data as unknown as ApplauseWithProfile[]).forEach(a => {
        const list = map.get(a.note_id) || [];
        list.push(a);
        map.set(a.note_id, list);
      });

      // Seed per-note cache
      map.forEach((applauseList, noteId) => {
        queryClient.setQueryData(['applause', noteId], applauseList);
      });

      return map;
    },
    enabled: noteIds.length > 0,
    staleTime: 30000,
  });
}

export function useGiveApplause() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (noteId: string) => {
      if (!profile?.id) throw new Error('Not authenticated');

      // Insert the applause
      const { data, error } = await supabase
        .from('applause')
        .insert({ note_id: noteId, user_id: profile.id })
        .select()
        .single();

      if (error) throw error;

      // Fetch the note to get the author_id for notification
      const { data: note } = await supabase
        .from('notes')
        .select('author_id')
        .eq('id', noteId)
        .single();

      // Create notification for the note author (but not if it's the same person)
      if (note && note.author_id !== profile.id) {
        await supabase.from('notifications').insert({
          user_id: note.author_id,
          from_user_id: profile.id,
          note_id: noteId,
          type: 'applause',
          content: 'gave you applause on your note',
        });
      }

      return data;
    },
    onMutate: async (noteId) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['applause', noteId] });
      const previous = queryClient.getQueryData<ApplauseWithProfile[]>(['applause', noteId]);

      if (profile) {
        queryClient.setQueryData<ApplauseWithProfile[]>(['applause', noteId], (old) => [
          ...(old || []),
          {
            id: `temp-${Date.now()}`,
            note_id: noteId,
            user_id: profile.id,
            created_at: new Date().toISOString(),
            profile: {
              id: profile.id,
              name: profile.name,
              avatar: profile.avatar,
            },
          },
        ]);
      }

      return { previous };
    },
    onError: (_err, noteId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['applause', noteId], context.previous);
      }
    },
    onSettled: (_data, _error, noteId) => {
      queryClient.invalidateQueries({ queryKey: ['applause', noteId] });
      // Also invalidate notifications so the count updates
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useRemoveApplause() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (noteId: string) => {
      if (!profile?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('applause')
        .delete()
        .eq('note_id', noteId)
        .eq('user_id', profile.id);

      if (error) throw error;
    },
    onMutate: async (noteId) => {
      await queryClient.cancelQueries({ queryKey: ['applause', noteId] });
      const previous = queryClient.getQueryData<ApplauseWithProfile[]>(['applause', noteId]);

      if (profile) {
        queryClient.setQueryData<ApplauseWithProfile[]>(['applause', noteId], (old) =>
          (old || []).filter((a) => a.user_id !== profile.id)
        );
      }

      return { previous };
    },
    onError: (_err, noteId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['applause', noteId], context.previous);
      }
    },
    onSettled: (_data, _error, noteId) => {
      queryClient.invalidateQueries({ queryKey: ['applause', noteId] });
    },
  });
}
