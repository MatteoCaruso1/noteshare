import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface FocusBacklogEntry {
  id: string;
  user_id: string;
  focus_text: string;
  focus_title: string;
  saved_at: string;
  original_focus_date: string | null;
  created_at: string;
}

export function useFocusBacklog() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all backlog entries
  const query = useQuery({
    queryKey: ['focus-backlog', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];

      const { data, error } = await supabase
        .from('focus_backlog')
        .select('id, user_id, focus_text, focus_title, saved_at, original_focus_date, created_at')
        .eq('user_id', profile.id)
        .order('saved_at', { ascending: false });

      if (error) throw error;
      return data as FocusBacklogEntry[];
    },
    enabled: !!profile?.id,
  });

  // Save to backlog — upsert by title (overwrite if same title exists)
  const saveToBacklog = useMutation({
    mutationFn: async ({ focusText, focusTitle, originalFocusDate }: { focusText: string; focusTitle?: string; originalFocusDate?: string }) => {
      if (!profile?.id) throw new Error('Not authenticated');

      const normalizedTitle = (focusTitle || '').trim();

      // Check if an entry with the same title already exists
      if (normalizedTitle) {
        const { data: existing } = await supabase
          .from('focus_backlog')
          .select('id')
          .eq('user_id', profile.id)
          .eq('focus_title', normalizedTitle)
          .maybeSingle();

        if (existing) {
          // Update existing entry
          const { data, error } = await supabase
            .from('focus_backlog')
            .update({
              focus_text: focusText,
              original_focus_date: originalFocusDate || null,
              saved_at: new Date().toISOString(),
            })
            .eq('id', existing.id)
            .select()
            .single();

          if (error) throw error;
          return data as FocusBacklogEntry;
        }
      }

      // Insert new entry
      const { data, error } = await supabase
        .from('focus_backlog')
        .insert({
          user_id: profile.id,
          focus_text: focusText,
          focus_title: normalizedTitle,
          original_focus_date: originalFocusDate || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as FocusBacklogEntry;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['focus-backlog', profile?.id] });
    },
  });

  // Delete from backlog
  const deleteFromBacklog = useMutation({
    mutationFn: async (id: string) => {
      if (!profile?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('focus_backlog')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['focus-backlog', profile?.id] });
    },
  });

  return {
    backlogEntries: query.data || [],
    isLoading: query.isLoading,
    saveToBacklog: saveToBacklog.mutate,
    isSaving: saveToBacklog.isPending,
    deleteFromBacklog: deleteFromBacklog.mutate,
    isDeleting: deleteFromBacklog.isPending,
  };
}
