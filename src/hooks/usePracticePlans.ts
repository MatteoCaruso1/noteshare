import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type PlanItemKind = 'section' | 'break';

export interface PlanItem {
  id: string;
  kind: PlanItemKind;
  title: string;
  minutes: number;
}

export interface PracticePlan {
  id: string;
  user_id: string;
  name: string;
  sections: PlanItem[];
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

export function usePracticePlans(profileId: string | undefined) {
  return useQuery({
    queryKey: ['practice-plans', profileId],
    enabled: !!profileId,
    queryFn: async (): Promise<PracticePlan[]> => {
      const { data, error } = await supabase
        .from('practice_plans')
        .select('*')
        .eq('user_id', profileId!)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((row: any) => ({
        ...row,
        sections: Array.isArray(row.sections) ? row.sections : [],
      }));
    },
  });
}

export function useSavePracticePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (plan: {
      id?: string;
      user_id: string;
      name: string;
      sections: PlanItem[];
    }) => {
      if (plan.id) {
        const { data, error } = await supabase
          .from('practice_plans')
          .update({
            name: plan.name,
            sections: plan.sections as any,
          })
          .eq('id', plan.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('practice_plans')
          .insert({
            user_id: plan.user_id,
            name: plan.name,
            sections: plan.sections as any,
          })
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['practice-plans', vars.user_id] });
      toast.success('Plan saved');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to save plan');
    },
  });
}

export function useDeletePracticePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; user_id: string }) => {
      const { error } = await supabase.from('practice_plans').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['practice-plans', vars.user_id] });
      toast.success('Plan deleted');
    },
  });
}

export function useTouchPracticePlan() {
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      await supabase
        .from('practice_plans')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', id);
    },
  });
}
