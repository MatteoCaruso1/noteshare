import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePremium } from '@/contexts/PremiumContext';
import { useCallback } from 'react';

const FREE_DAILY_LIMIT = 1;

/**
 * Returns the current date in YYYY-MM-DD format in local timezone
 */
function getTodayLocalDate(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

export function useDailyNoteLimit() {
  const { profile } = useAuth();
  const { isPremium, isLoading: premiumLoading } = usePremium();
  const queryClient = useQueryClient();

  const { data: notesPostedToday = 0, isLoading, error, refetch } = useQuery({
    queryKey: ['daily-note-count', profile?.id],
    queryFn: async () => {
      if (!profile) return 0;

      const today = getTodayLocalDate();
      const startOfDay = `${today}T00:00:00.000Z`;
      const endOfDay = `${today}T23:59:59.999Z`;

      const { count, error } = await supabase
        .from('notes')
        .select('id', { count: 'exact', head: true })
        .eq('author_id', profile.id)
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay);

      if (error) throw error;

      return count || 0;
    },
    enabled: !!profile,
    staleTime: 30 * 1000, // Consider fresh for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });

  // Premium users have unlimited notes
  const hasReachedLimit = !isPremium && notesPostedToday >= FREE_DAILY_LIMIT;
  const remainingNotes = isPremium ? Infinity : Math.max(0, FREE_DAILY_LIMIT - notesPostedToday);

  // Optimistically increment the count and invalidate the query
  const incrementCount = useCallback(() => {
    // Optimistically update the cache
    queryClient.setQueryData(['daily-note-count', profile?.id], (old: number | undefined) => (old ?? 0) + 1);
    // Then invalidate to refetch the actual count
    queryClient.invalidateQueries({ queryKey: ['daily-note-count'] });
  }, [queryClient, profile?.id]);

  // Refresh function for manual refresh
  const refresh = useCallback(() => {
    refetch();
  }, [refetch]);

  return {
    notesPostedToday,
    hasReachedLimit,
    remainingNotes,
    dailyLimit: isPremium ? Infinity : FREE_DAILY_LIMIT,
    isLoading: isLoading || premiumLoading,
    error: error instanceof Error ? error.message : null,
    refresh,
    incrementCount,
    isPremium,
  };
}
