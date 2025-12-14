import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useUpdateNoteVisibility() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      noteId,
      visibility,
    }: {
      noteId: string;
      visibility: 'private' | 'friends';
    }) => {
      const { data, error } = await supabase
        .from('notes')
        .update({ visibility, updated_at: new Date().toISOString() })
        .eq('id', noteId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['friends-notes'] });
      toast.success('Visibility updated');
    },
    onError: (error) => {
      console.error('Error updating visibility:', error);
      toast.error('Failed to update visibility');
    },
  });
}