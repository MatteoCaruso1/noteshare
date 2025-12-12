import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Goal } from '@/types';

export function useGoals(userId?: string) {
  return useQuery({
    queryKey: ['goals', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', userId)
        .order('goal_type', { ascending: true });

      if (error) throw error;
      return data as Goal[];
    },
    enabled: !!userId,
  });
}

export function useUpsertGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      userId,
      goalType,
      content,
      targetDate,
      visibility,
    }: {
      id?: string;
      userId: string;
      goalType: 'near-term' | 'long-term';
      content: string;
      targetDate?: string | null;
      visibility: 'public' | 'private';
    }) => {
      if (id) {
        // Update existing goal
        const { data, error } = await supabase
          .from('goals')
          .update({
            content,
            target_date: targetDate,
            visibility,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Create new goal
        const { data, error } = await supabase
          .from('goals')
          .insert({
            user_id: userId,
            goal_type: goalType,
            content,
            target_date: targetDate,
            visibility,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      toast.success('Goal saved!');
    },
    onError: (error) => {
      console.error('Error saving goal:', error);
      toast.error('Failed to save goal');
    },
  });
}

export function useDeleteGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (goalId: string) => {
      const { error } = await supabase
        .from('goals')
        .delete()
        .eq('id', goalId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      toast.success('Goal deleted');
    },
    onError: (error) => {
      console.error('Error deleting goal:', error);
      toast.error('Failed to delete goal');
    },
  });
}