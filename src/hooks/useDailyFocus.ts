import { useEffect, useRef } from 'react';
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

export const FOCUS_CACHE_KEY = 'noteshare_focus_cache';

export function getFocusCacheKey(userId?: string | null): string {
  return userId ? `${FOCUS_CACHE_KEY}:${userId}` : FOCUS_CACHE_KEY;
}

export function readFocusCache(userId?: string | null): DailyFocus | null {
  try {
    const scopedKey = getFocusCacheKey(userId);
    const scopedRaw = localStorage.getItem(scopedKey);
    if (scopedRaw) {
      const scopedParsed = JSON.parse(scopedRaw);
      if (scopedParsed && typeof scopedParsed === 'object' && scopedParsed.id) {
        return scopedParsed as DailyFocus;
      }
    }

    // Backward compatibility for legacy global cache key.
    // Only reuse it when it belongs to the current user, then migrate it.
    const legacyRaw = localStorage.getItem(FOCUS_CACHE_KEY);
    if (!legacyRaw) return null;

    const legacyParsed = JSON.parse(legacyRaw);
    if (!legacyParsed || typeof legacyParsed !== 'object' || !legacyParsed.id) {
      return null;
    }

    const cacheOwner = legacyParsed.user_id as string | undefined;
    if (userId && cacheOwner === userId) {
      localStorage.setItem(scopedKey, legacyRaw);
      localStorage.removeItem(FOCUS_CACHE_KEY);
      return legacyParsed as DailyFocus;
    }

    // Prevent cross-account leakage from stale legacy cache.
    if (userId && cacheOwner && cacheOwner !== userId) {
      localStorage.removeItem(FOCUS_CACHE_KEY);
    }

    return null;
  } catch {
    return null;
  }
}

function writeFocusCache(focus: DailyFocus) {
  try {
    localStorage.setItem(getFocusCacheKey(focus.user_id), JSON.stringify({
      id: focus.id,
      user_id: focus.user_id,
      focus_date: focus.focus_date,
      focus_text: focus.focus_text,
      created_at: focus.created_at,
      updated_at: focus.updated_at,
    }));
    // Remove legacy cache key after successful scoped write.
    localStorage.removeItem(FOCUS_CACHE_KEY);
  } catch { /* quota exceeded — ignore */ }
}

// Get the user's local date as YYYY-MM-DD (timezone-safe)
function getLocalDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function useTodaysFocus() {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  // Keep a ref so the mutation can still identify the user during sign-out
  const userIdRef = useRef(userId);
  useEffect(() => {
    if (userId) userIdRef.current = userId;
  }, [userId]);

  // Fetch today's focus entry, or the most recent one if today doesn't exist
  const query = useQuery({
    queryKey: ['daily-focus', userId],
    queryFn: async () => {
      if (!userId) return null;

      const today = getLocalDateString();

      // First, try to get today's focus
      const { data: todayFocus, error: todayError } = await supabase
        .from('daily_focus')
        .select('id, user_id, focus_date, focus_text, created_at, updated_at')
        .eq('user_id', userId)
        .eq('focus_date', today)
        .maybeSingle();

      if (todayError) throw todayError;

      if (todayFocus) {
        return todayFocus as DailyFocus;
      }

      // If no entry for today, get the most recent focus to carry forward
      const { data: recentFocus, error: recentError } = await supabase
        .from('daily_focus')
        .select('id, user_id, focus_date, focus_text, created_at, updated_at')
        .eq('user_id', userId)
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
    enabled: !!userId,
    staleTime: 30 * 1000, // 30s — ensures cross-device edits sync quickly
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: true,
    placeholderData: () => readFocusCache(userId),
  });

  // Persist to localStorage whenever fresh data arrives
  // BUT: don't overwrite local cache if it has unsaved edits (newer than DB)
  const freshData = query.data;
  const isPlaceholder = query.isPlaceholderData;
  useEffect(() => {
    if (freshData && !isPlaceholder && freshData.focus_text !== undefined) {
      // Check if local cache has content that differs from DB
      // If so, the local cache is likely newer (unsaved edit from before iOS killed the tab)
      const existingCache = readFocusCache(userId);
      if (existingCache && existingCache.focus_text !== freshData.focus_text) {
        // Local cache differs from DB — local is potentially newer (unsaved edits)
        // Only overwrite if DB data is actually newer (updated_at comparison)
        const dbUpdated = new Date(freshData.updated_at).getTime();
        const cacheUpdated = new Date(existingCache.updated_at).getTime();
        if (dbUpdated > cacheUpdated) {
          writeFocusCache(freshData as DailyFocus);
        }
        // Otherwise keep local cache (it has unsaved changes)
      } else {
        writeFocusCache(freshData as DailyFocus);
      }
    }
  }, [freshData, isPlaceholder, userId]);

  // Upsert today's focus
  const updateFocus = useMutation({
    mutationFn: async (focusText: string) => {
      const effectiveUserId = userId || userIdRef.current;
      if (!effectiveUserId) throw new Error('Not authenticated');

      const today = getLocalDateString();

      const { data, error } = await supabase
        .from('daily_focus')
        .upsert(
          {
            user_id: userId,
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
      queryClient.invalidateQueries({ queryKey: ['daily-focus', userId] });
      queryClient.invalidateQueries({ queryKey: ['current-focus-entry', userId] });
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
// Derives from useTodaysFocus cache instead of making a separate DB call
export function useCurrentFocusEntry() {
  const { focus, isLoading } = useTodaysFocus();
  
  // useTodaysFocus already returns today's focus or the most recent carried-forward one
  // Just re-expose the data in the shape consumers expect
  return {
    data: focus as (DailyFocus & { isCarriedForward?: boolean }) | null | undefined,
    isLoading,
    isPending: isLoading,
  };
}

// Hook to fetch all focus entries for history view
export function useFocusHistory() {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: ['focus-history', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('daily_focus')
        .select('id, user_id, focus_date, focus_text, created_at, updated_at')
        .eq('user_id', userId)
        .order('focus_date', { ascending: false });

      if (error) throw error;
      return data as DailyFocus[];
    },
    enabled: !!userId,
  });
}

// Hook to fetch all focus dates for filtering
export function useFocusDates() {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: ['focus-dates', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('daily_focus')
        .select('focus_date')
        .eq('user_id', userId)
        .order('focus_date', { ascending: false });

      if (error) throw error;
      return data.map((d) => d.focus_date) as string[];
    },
    enabled: !!userId,
  });
}
