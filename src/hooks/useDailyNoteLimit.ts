import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { usePremium } from '@/contexts/PremiumContext';

const FREE_DAILY_LIMIT = 1;

interface DailyNoteLimitState {
  notesPostedToday: number;
  isLoading: boolean;
  error: string | null;
}

/**
 * Returns the current date in YYYY-MM-DD format in local timezone
 */
function getTodayLocalDate(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

export function useDailyNoteLimit() {
  const { user } = useAuth();
  const { isPremium, isLoading: premiumLoading } = usePremium();
  
  const [state, setState] = useState<DailyNoteLimitState>({
    notesPostedToday: 0,
    isLoading: true,
    error: null,
  });

  const fetchTodaysNotes = useCallback(async () => {
    if (!user) {
      setState({ notesPostedToday: 0, isLoading: false, error: null });
      return;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const today = getTodayLocalDate();
      const startOfDay = `${today}T00:00:00.000Z`;
      const endOfDay = `${today}T23:59:59.999Z`;

      const { count, error } = await supabase
        .from('notes')
        .select('id', { count: 'exact', head: true })
        .eq('author_id', user.id)
        .gte('created_at', startOfDay)
        .lte('created_at', endOfDay);

      if (error) throw error;

      setState({
        notesPostedToday: count || 0,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      console.error('Error fetching daily note count:', err);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to check daily limit',
      }));
    }
  }, [user]);

  // Fetch on mount and when user changes
  useEffect(() => {
    fetchTodaysNotes();
  }, [fetchTodaysNotes]);

  // Premium users have unlimited notes
  const hasReachedLimit = !isPremium && state.notesPostedToday >= FREE_DAILY_LIMIT;
  const remainingNotes = isPremium ? Infinity : Math.max(0, FREE_DAILY_LIMIT - state.notesPostedToday);

  // Increment the local count after posting (optimistic update)
  const incrementCount = useCallback(() => {
    setState(prev => ({
      ...prev,
      notesPostedToday: prev.notesPostedToday + 1,
    }));
  }, []);

  return {
    notesPostedToday: state.notesPostedToday,
    hasReachedLimit,
    remainingNotes,
    dailyLimit: isPremium ? Infinity : FREE_DAILY_LIMIT,
    isLoading: state.isLoading || premiumLoading,
    error: state.error,
    refresh: fetchTodaysNotes,
    incrementCount,
    isPremium,
  };
}
