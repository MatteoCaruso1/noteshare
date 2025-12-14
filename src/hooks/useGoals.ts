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
      
      // Sort by priority then created_at
      const goals = (data as unknown as Goal[]).sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });
      
      return goals;
    },
    enabled: !!userId,
  });
}

export function useCreateGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      goalType,
      title,
      description,
      targetDate,
      progressType,
      targetSteps,
      targetMinutes,
    }: {
      userId: string;
      goalType: 'near-term' | 'long-term';
      title: string;
      description?: string | null;
      targetDate?: string | null;
      progressType: 'checkbox' | 'step' | 'time';
      targetSteps?: number;
      targetMinutes?: number;
    }) => {
      // Get current max priority for this goal type
      const { data: existingGoals } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', userId)
        .eq('goal_type', goalType);

      const goalsTyped = (existingGoals as unknown as Goal[]) || [];
      const activeGoals = goalsTyped.filter(g => !g.is_completed);
      const maxPriority = activeGoals.length > 0 
        ? Math.max(...activeGoals.map(g => g.priority ?? 0)) 
        : -1;

      const insertData = {
        user_id: userId,
        goal_type: goalType,
        title,
        content: title,
        description,
        target_date: targetDate,
        progress_type: progressType,
        target_steps: targetSteps ?? 1,
        target_minutes: targetMinutes ?? 0,
        priority: maxPriority + 1,
      };

      const { data, error } = await (supabase
        .from('goals') as unknown as { insert: (data: Record<string, unknown>) => { select: () => { single: () => Promise<{ data: unknown; error: Error | null }> } } })
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      toast.success('Goal created!');
    },
    onError: (error) => {
      console.error('Error creating goal:', error);
      toast.error('Failed to create goal');
    },
  });
}

export function useUpdateGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<Goal> & { id: string }) => {
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString(),
      };
      
      const { data, error } = await supabase
        .from('goals')
        .update(updateData as Record<string, unknown>)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
    onError: (error) => {
      console.error('Error updating goal:', error);
      toast.error('Failed to update goal');
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

export function useReorderGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      goalId,
      newPriority,
    }: {
      goalId: string;
      newPriority: number;
    }) => {
      const { error } = await supabase
        .from('goals')
        .update({ priority: newPriority } as Record<string, unknown>)
        .eq('id', goalId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });
}

export function useCompleteGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      goalId,
      reflection,
    }: {
      goalId: string;
      reflection?: string;
    }) => {
      // First get the goal to update progress to 100%
      const { data: goalData } = await supabase
        .from('goals')
        .select('*')
        .eq('id', goalId)
        .single();

      const goal = goalData as unknown as Goal;
      
      const updateData = {
        is_completed: true,
        completed_at: new Date().toISOString(),
        reflection,
        current_steps: goal?.target_steps ?? 1,
        current_minutes: goal?.target_minutes ?? 0,
      };

      const { error } = await supabase
        .from('goals')
        .update(updateData as Record<string, unknown>)
        .eq('id', goalId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      toast.success('Goal completed! 🎉');
    },
    onError: (error) => {
      console.error('Error completing goal:', error);
      toast.error('Failed to complete goal');
    },
  });
}

export function useIncrementProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      goalId,
      field,
      amount = 1,
    }: {
      goalId: string;
      field: 'current_steps' | 'current_minutes';
      amount?: number;
    }) => {
      // Get current value
      const { data: goalData } = await supabase
        .from('goals')
        .select('*')
        .eq('id', goalId)
        .single();

      const goal = goalData as unknown as Goal;
      if (!goal) throw new Error('Goal not found');

      const currentValue = goal[field] || 0;
      const targetValue = field === 'current_steps' ? goal.target_steps : goal.target_minutes;
      const newValue = Math.min(currentValue + amount, targetValue);

      const updates: Record<string, unknown> = { [field]: newValue };
      
      // Auto-complete if target reached
      if (newValue >= targetValue) {
        updates.is_completed = true;
        updates.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('goals')
        .update(updates)
        .eq('id', goalId);

      if (error) throw error;
      
      return { isComplete: newValue >= targetValue };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      if (result.isComplete) {
        toast.success('Goal completed! 🎉');
      }
    },
  });
}

export function useDecrementProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      goalId,
      field,
      amount = 1,
    }: {
      goalId: string;
      field: 'current_steps' | 'current_minutes';
      amount?: number;
    }) => {
      const { data: goalData } = await supabase
        .from('goals')
        .select('*')
        .eq('id', goalId)
        .single();

      const goal = goalData as unknown as Goal;
      if (!goal) throw new Error('Goal not found');

      const currentValue = goal[field] || 0;
      const newValue = Math.max(0, currentValue - amount);

      const { error } = await supabase
        .from('goals')
        .update({ 
          [field]: newValue,
          is_completed: false,
          completed_at: null,
        } as Record<string, unknown>)
        .eq('id', goalId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });
}

// Keep legacy hook for backwards compatibility
export function useUpsertGoal() {
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();

  return {
    mutate: (params: {
      id?: string;
      userId: string;
      goalType: 'near-term' | 'long-term';
      content: string;
      targetDate?: string | null;
    }) => {
      if (params.id) {
        updateGoal.mutate({
          id: params.id,
          title: params.content,
          content: params.content,
          target_date: params.targetDate,
        });
      } else {
        createGoal.mutate({
          userId: params.userId,
          goalType: params.goalType,
          title: params.content,
          progressType: 'checkbox',
        });
      }
    },
    isPending: createGoal.isPending || updateGoal.isPending,
  };
}
