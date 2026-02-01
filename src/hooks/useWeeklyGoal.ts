import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { usePracticeStats } from './usePracticeStats';
import { startOfWeek, subWeeks, format, isMonday, isSameDay } from 'date-fns';

interface WeeklyGoal {
  id: string;
  user_id: string;
  week_start: string;
  target_minutes: number;
  skipped: boolean;
  created_at: string;
  updated_at: string;
}

const WEEKLY_GOAL_MODAL_KEY = 'noteshare_weekly_goal_modal_shown';

function getWeekStart(date: Date = new Date()): Date {
  return startOfWeek(date, { weekStartsOn: 1 }); // Monday
}

function formatWeekStart(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function useWeeklyGoal(profileId: string | undefined) {
  const queryClient = useQueryClient();
  const currentWeekStart = formatWeekStart(getWeekStart());
  const lastWeekStart = formatWeekStart(getWeekStart(subWeeks(new Date(), 1)));

  // Fetch current week's goal
  const currentWeekQuery = useQuery({
    queryKey: ['weekly-goal', profileId, currentWeekStart],
    queryFn: async () => {
      if (!profileId) return null;
      
      const { data, error } = await supabase
        .from('weekly_goals')
        .select('*')
        .eq('user_id', profileId)
        .eq('week_start', currentWeekStart)
        .maybeSingle();
      
      if (error) throw error;
      return data as WeeklyGoal | null;
    },
    enabled: !!profileId,
  });

  // Fetch last week's goal for recap
  const lastWeekQuery = useQuery({
    queryKey: ['weekly-goal', profileId, lastWeekStart],
    queryFn: async () => {
      if (!profileId) return null;
      
      const { data, error } = await supabase
        .from('weekly_goals')
        .select('*')
        .eq('user_id', profileId)
        .eq('week_start', lastWeekStart)
        .maybeSingle();
      
      if (error) throw error;
      return data as WeeklyGoal | null;
    },
    enabled: !!profileId,
  });

  // Set weekly goal mutation
  const setGoalMutation = useMutation({
    mutationFn: async ({ targetMinutes, skipped = false }: { targetMinutes: number; skipped?: boolean }) => {
      if (!profileId) throw new Error('No profile ID');
      
      const { data, error } = await supabase
        .from('weekly_goals')
        .upsert({
          user_id: profileId,
          week_start: currentWeekStart,
          target_minutes: targetMinutes,
          skipped,
        }, {
          onConflict: 'user_id,week_start',
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weekly-goal', profileId] });
    },
  });

  return {
    currentWeekGoal: currentWeekQuery.data,
    lastWeekGoal: lastWeekQuery.data,
    isLoading: currentWeekQuery.isLoading || lastWeekQuery.isLoading,
    setGoal: setGoalMutation.mutate,
    isPending: setGoalMutation.isPending,
    currentWeekStart,
    lastWeekStart,
  };
}

// LocalStorage key for disabling weekly goal feature
export const WEEKLY_GOAL_DISABLED_KEY = 'noteshare_weekly_goal_disabled';

// Hook to determine if we should show the modal
export function useShouldShowWeeklyGoalModal(profileId: string | undefined, isPremium: boolean) {
  const { currentWeekGoal, isLoading } = useWeeklyGoal(profileId);
  
  // Check if today is Monday
  const today = new Date();
  const isToday = isMonday(today);
  
  // Check localStorage for whether we've shown the modal this week
  const currentWeekStart = formatWeekStart(getWeekStart());
  const storedKey = localStorage.getItem(WEEKLY_GOAL_MODAL_KEY);
  const hasShownThisWeek = storedKey === currentWeekStart;
  
  // Check if user has disabled the feature
  const isDisabled = localStorage.getItem(WEEKLY_GOAL_DISABLED_KEY) === 'true';
  
  // Should show modal if:
  // 1. User is premium
  // 2. It's Monday
  // 3. No goal set for this week yet
  // 4. Haven't shown the modal already this week
  // 5. Feature is not disabled
  const shouldShow = isPremium && 
    isToday && 
    !isLoading && 
    !currentWeekGoal && 
    !hasShownThisWeek &&
    !isDisabled;
  
  const markAsShown = () => {
    localStorage.setItem(WEEKLY_GOAL_MODAL_KEY, currentWeekStart);
  };
  
  return { shouldShow, markAsShown };
}

// Hook to get last week's practice minutes from practice stats
export function useLastWeekPracticeMinutes(profileId: string | undefined) {
  const { data: stats } = usePracticeStats(profileId);
  
  // Get the last completed week's minutes from weeklyMinutesOverTime
  // The array has 12 weeks, index 10 would be last week (index 11 is current week)
  if (!stats?.weeklyMinutesOverTime || stats.weeklyMinutesOverTime.length < 2) {
    return 0;
  }
  
  // Last week is the second-to-last entry
  const lastWeekData = stats.weeklyMinutesOverTime[stats.weeklyMinutesOverTime.length - 2];
  return lastWeekData?.minutes || 0;
}

// Hook to get current week's practice minutes (for progress display)
export function useCurrentWeekPracticeMinutes(profileId: string | undefined) {
  const { data: stats } = usePracticeStats(profileId);
  
  if (!stats?.weeklyMinutesOverTime || stats.weeklyMinutesOverTime.length === 0) {
    return 0;
  }
  
  // Current week is the last entry
  const currentWeekData = stats.weeklyMinutesOverTime[stats.weeklyMinutesOverTime.length - 1];
  return currentWeekData?.minutes || 0;
}
