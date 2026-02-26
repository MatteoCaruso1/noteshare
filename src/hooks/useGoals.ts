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
        .select('id, user_id, goal_type, title, content, description, target_date, progress_type, target_steps, current_steps, target_minutes, current_minutes, is_completed, completed_at, reflection, priority, created_at, updated_at')
        .eq('user_id', userId)
        .order('goal_type', { ascending: true });

      if (error) throw error;
      
      const goals = (data as unknown as Goal[]).sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });
      
      return goals;
    },
    enabled: !!userId,
    staleTime: 60 * 1000,
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
        .select('id, priority, is_completed')
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
      targetGoalId,
      newPriority,
      targetNewPriority,
    }: {
      goalId: string;
      targetGoalId: string;
      newPriority: number;
      targetNewPriority: number;
    }) => {
      // Update both goals in parallel
      const [result1, result2] = await Promise.all([
        supabase
          .from('goals')
          .update({ priority: newPriority } as Record<string, unknown>)
          .eq('id', goalId),
        supabase
          .from('goals')
          .update({ priority: targetNewPriority } as Record<string, unknown>)
          .eq('id', targetGoalId),
      ]);

      if (result1.error) throw result1.error;
      if (result2.error) throw result2.error;
    },
    onMutate: async ({ goalId, targetGoalId, newPriority, targetNewPriority }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['goals'] });

      // Snapshot the previous value
      const previousGoals = queryClient.getQueriesData<Goal[]>({ queryKey: ['goals'] });

      // Optimistically update the cache
      queryClient.setQueriesData<Goal[]>(
        { queryKey: ['goals'] },
        (old) => {
          if (!old) return old;
          return old.map(goal => {
            if (goal.id === goalId) {
              return { ...goal, priority: newPriority };
            }
            if (goal.id === targetGoalId) {
              return { ...goal, priority: targetNewPriority };
            }
            return goal;
          }).sort((a, b) => {
            if (a.priority !== b.priority) return a.priority - b.priority;
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          });
        }
      );

      return { previousGoals };
    },
    onError: (error, _, context) => {
      // Rollback on error
      if (context?.previousGoals) {
        context.previousGoals.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      console.error('Error reordering goal:', error);
    },
    onSettled: () => {
      // Sync with server after mutation settles
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
        .select('id, target_steps, target_minutes')
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
        .select('id, current_steps, current_minutes, target_steps, target_minutes')
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
        .select('id, current_steps, current_minutes, target_steps, target_minutes')
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

export function useSetProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      goalId,
      field,
      value,
    }: {
      goalId: string;
      field: 'current_steps' | 'current_minutes';
      value: number;
    }) => {
      const { data: goalData } = await supabase
        .from('goals')
        .select('id, current_steps, current_minutes, target_steps, target_minutes')
        .eq('id', goalId)
        .single();

      const goal = goalData as unknown as Goal;
      if (!goal) throw new Error('Goal not found');

      const targetValue = field === 'current_steps' ? goal.target_steps : goal.target_minutes;
      const clampedValue = Math.max(0, Math.min(value, targetValue));

      const updates: Record<string, unknown> = { [field]: clampedValue };
      
      // Auto-complete if target reached
      if (clampedValue >= targetValue) {
        updates.is_completed = true;
        updates.completed_at = new Date().toISOString();
      } else {
        // Un-complete if below target
        updates.is_completed = false;
        updates.completed_at = null;
      }

      const { error } = await supabase
        .from('goals')
        .update(updates)
        .eq('id', goalId);

      if (error) throw error;
      
      return { isComplete: clampedValue >= targetValue };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      if (result.isComplete) {
        toast.success('Goal completed! 🎉');
      }
    },
  });
}

export function useRestoreGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      goalId,
      goalType,
    }: {
      goalId: string;
      goalType: 'near-term' | 'long-term';
    }) => {
      // Get current goal data
      const { data: goalData } = await supabase
        .from('goals')
        .select('id, user_id')
        .eq('id', goalId)
        .single();

      const goal = goalData as unknown as Goal;
      if (!goal) throw new Error('Goal not found');

      // Get max priority for this goal type
      const { data: existingGoals } = await supabase
        .from('goals')
        .select('id, priority, is_completed')
        .eq('user_id', goal.user_id)
        .eq('goal_type', goalType);

      const goalsTyped = (existingGoals as unknown as Goal[]) || [];
      const activeGoals = goalsTyped.filter(g => !g.is_completed);
      const maxPriority = activeGoals.length > 0 
        ? Math.max(...activeGoals.map(g => g.priority ?? 0)) 
        : -1;

      const { error } = await supabase
        .from('goals')
        .update({
          is_completed: false,
          completed_at: null,
          reflection: null,
          current_steps: 0,
          current_minutes: 0,
          priority: maxPriority + 1,
        } as Record<string, unknown>)
        .eq('id', goalId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      toast.success('Goal restored to in-progress');
    },
    onError: (error) => {
      console.error('Error restoring goal:', error);
      toast.error('Failed to restore goal');
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
