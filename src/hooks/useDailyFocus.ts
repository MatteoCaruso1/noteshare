import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface DailyFocus {
  id: string;
  user_id: string;
  focus_date: string;
  focus_text: string;
  created_at: string;
  updated_at: string;
}

// Get the user's local date as YYYY-MM-DD
function getLocalDateString(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

export function useTodaysFocus() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  // Fetch today's focus entry, or the most recent one if today doesn't exist
  const query = useQuery({
    queryKey: ['daily-focus', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return null;

      const today = getLocalDateString();

      // First, try to get today's focus
      const { data: todayFocus, error: todayError } = await supabase
        .from('daily_focus')
        .select('*')
        .eq('user_id', profile.id)
        .eq('focus_date', today)
        .maybeSingle();

      if (todayError) throw todayError;

      if (todayFocus) {
        return todayFocus as DailyFocus;
      }

      // If no entry for today, get the most recent focus to carry forward
      const { data: recentFocus, error: recentError } = await supabase
        .from('daily_focus')
        .select('*')
        .eq('user_id', profile.id)
        .order('focus_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (recentError) throw recentError;

      // Return the recent focus but mark it as "carried forward"
      if (recentFocus) {
        return {
          ...recentFocus,
          isCarriedForward: true,
        } as DailyFocus & { isCarriedForward?: boolean };
      }

      return null;
    },
    enabled: !!profile?.id,
  });

  // Upsert today's focus
  const updateFocus = useMutation({
    mutationFn: async (focusText: string) => {
      if (!profile?.id) throw new Error('Not authenticated');

      const today = getLocalDateString();

      const { data, error } = await supabase
        .from('daily_focus')
        .upsert(
          {
            user_id: profile.id,
            focus_date: today,
            focus_text: focusText,
          },
          {
            onConflict: 'user_id,focus_date',
          }
        )
        .select()
        .single();

      if (error) throw error;
      return data as DailyFocus;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['daily-focus', profile?.id] });
    },
  });

  return {
    focus: query.data,
    isLoading: query.isLoading,
    updateFocus: updateFocus.mutate,
    isUpdating: updateFocus.isPending,
  };
}

// Hook to get the current focus entry for attaching to notes/sessions
export function useCurrentFocusEntry() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['current-focus-entry', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return null;

      const today = getLocalDateString();

      const { data, error } = await supabase
        .from('daily_focus')
        .select('*')
        .eq('user_id', profile.id)
        .eq('focus_date', today)
        .maybeSingle();

      if (error) throw error;
      return data as DailyFocus | null;
    },
    enabled: !!profile?.id,
  });
}

// Hook to fetch all focus dates for filtering
export function useFocusDates() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['focus-dates', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];

      const { data, error } = await supabase
        .from('daily_focus')
        .select('focus_date')
        .eq('user_id', profile.id)
        .order('focus_date', { ascending: false });

      if (error) throw error;
      return data.map((d) => d.focus_date) as string[];
    },
    enabled: !!profile?.id,
  });
}
