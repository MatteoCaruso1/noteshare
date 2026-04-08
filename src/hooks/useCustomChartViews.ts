import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CustomChartView {
  id: string;
  user_id: string;
  name: string;
  chart_type: 'line' | 'bar' | 'histogram' | 'gauge' | 'donut';
  metric: string;
  time_granularity: 'weekly' | 'monthly';
  time_range: string;
  display_order: number;
  visible: boolean;
  created_at: string;
  updated_at: string;
}

export function useCustomChartViews(profileId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['custom-chart-views', profileId],
    queryFn: async () => {
      if (!profileId) return [];
      const { data, error } = await supabase
        .from('custom_chart_views')
        .select('*')
        .eq('user_id', profileId)
        .order('display_order', { ascending: true });
      if (error) throw error;
      return data as CustomChartView[];
    },
    enabled: !!profileId,
    staleTime: 5 * 60 * 1000,
  });

  const saveMutation = useMutation({
    mutationFn: async (view: Omit<CustomChartView, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('custom_chart_views')
        .insert(view)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-chart-views', profileId] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CustomChartView> & { id: string }) => {
      const { error } = await supabase
        .from('custom_chart_views')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-chart-views', profileId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('custom_chart_views')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-chart-views', profileId] });
    },
  });

  return {
    views: query.data || [],
    isLoading: query.isLoading,
    save: saveMutation.mutate,
    update: updateMutation.mutate,
    remove: deleteMutation.mutate,
    isSaving: saveMutation.isPending,
  };
}
