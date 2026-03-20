import { useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface DailyFocus {
  id: string;
  user_id: string;
  focus_date: string;
  focus_text: string;
  focus_title: string;
  created_at: string;
  updated_at: string;
}

// ── Draft cache (survives navigation even without a DB row) ──
const DRAFT_KEY_PREFIX = 'noteshare_focus_draft';

function getDraftKey(profileId: string): string {
  return `${DRAFT_KEY_PREFIX}:${profileId}`;
}

export interface FocusDraft {
  text: string;
  updated_at: string; // ISO string
}

export function readDraft(profileId?: string | null): FocusDraft | null {
  if (!profileId) return null;
  try {
    const raw = localStorage.getItem(getDraftKey(profileId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.text === 'string' && parsed.updated_at) return parsed;
    return null;
  } catch { return null; }
}

export function writeDraft(profileId: string, text: string) {
  try {
    localStorage.setItem(getDraftKey(profileId), JSON.stringify({
      text,
      updated_at: new Date().toISOString(),
    }));
  } catch { /* quota */ }
}

export function clearDraft(profileId: string) {
  try { localStorage.removeItem(getDraftKey(profileId)); } catch { /* */ }
}

// ── Persisted focus cache (reflects a real DB row) ──
export const FOCUS_CACHE_KEY = 'noteshare_focus_cache';

export function getFocusCacheKey(profileId?: string | null): string {
  return profileId ? `${FOCUS_CACHE_KEY}:${profileId}` : FOCUS_CACHE_KEY;
}

export function readFocusCache(profileId?: string | null): DailyFocus | null {
  try {
    // 1. Profile-scoped key
    if (profileId) {
      const scopedRaw = localStorage.getItem(getFocusCacheKey(profileId));
      if (scopedRaw) {
        const parsed = JSON.parse(scopedRaw);
        if (parsed && typeof parsed === 'object' && parsed.id) return parsed as DailyFocus;
      }
    }

    // 2. Legacy global key – migrate if owner matches
    const legacyRaw = localStorage.getItem(FOCUS_CACHE_KEY);
    if (!legacyRaw) return null;
    const legacyParsed = JSON.parse(legacyRaw);
    if (!legacyParsed || typeof legacyParsed !== 'object' || !legacyParsed.id) return null;

    const cacheOwner = legacyParsed.user_id as string | undefined;
    if (profileId && cacheOwner === profileId) {
      localStorage.setItem(getFocusCacheKey(profileId), legacyRaw);
      localStorage.removeItem(FOCUS_CACHE_KEY);
      return legacyParsed as DailyFocus;
    }
    // Cross-account: purge stale legacy
    if (profileId && cacheOwner && cacheOwner !== profileId) {
      localStorage.removeItem(FOCUS_CACHE_KEY);
    }
    return null;
  } catch { return null; }
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
    localStorage.removeItem(FOCUS_CACHE_KEY);
  } catch { /* quota */ }
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
  const { profile } = useAuth();
  const profileId = profile?.id;
  const queryClient = useQueryClient();

  // Keep a ref so the mutation can still identify the user during sign-out
  const profileIdRef = useRef(profileId);
  useEffect(() => {
    if (profileId) profileIdRef.current = profileId;
  }, [profileId]);

  // Fetch today's focus entry, or the most recent one if today doesn't exist
  const query = useQuery({
    queryKey: ['daily-focus', profileId],
    queryFn: async () => {
      if (!profileId) return null;

      const today = getLocalDateString();

      const { data: todayFocus, error: todayError } = await supabase
        .from('daily_focus')
        .select('id, user_id, focus_date, focus_text, created_at, updated_at')
        .eq('user_id', profileId)
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
        .eq('user_id', profileId)
        .order('focus_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (recentError) throw recentError;

      if (recentFocus) {
        return {
          ...recentFocus,
          isCarriedForward: true,
        } as DailyFocus & { isCarriedForward?: boolean };
      }

      return null;
    },
    enabled: !!profileId,
    staleTime: 30 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: true,
    placeholderData: () => readFocusCache(profileId),
  });

  // Persist to localStorage whenever fresh data arrives
  const freshData = query.data;
  const isPlaceholder = query.isPlaceholderData;
  useEffect(() => {
    if (freshData && !isPlaceholder && freshData.focus_text !== undefined) {
      const existingCache = readFocusCache(profileId);
      if (existingCache && existingCache.focus_text !== freshData.focus_text) {
        const dbUpdated = new Date(freshData.updated_at).getTime();
        const cacheUpdated = new Date(existingCache.updated_at).getTime();
        if (dbUpdated > cacheUpdated) {
          writeFocusCache(freshData as DailyFocus);
        }
      } else {
        writeFocusCache(freshData as DailyFocus);
      }
    }
  }, [freshData, isPlaceholder, profileId]);

  // Upsert today's focus – returns the mutateAsync function for hardened save
  const updateFocusMutation = useMutation({
    mutationFn: async (focusText: string) => {
      const effectiveId = profileId || profileIdRef.current;
      if (!effectiveId) throw new Error('Not authenticated');

      const today = getLocalDateString();

      const { data, error } = await supabase
        .from('daily_focus')
        .upsert(
          {
            user_id: effectiveId,
            focus_date: today,
            focus_text: focusText,
          },
          { onConflict: 'user_id,focus_date' }
        )
        .select()
        .single();

      if (error) throw error;
      return data as DailyFocus;
    },
    onSuccess: (data) => {
      // Update persisted cache with the DB-confirmed row
      writeFocusCache(data);
      queryClient.invalidateQueries({ queryKey: ['daily-focus', profileId] });
      queryClient.invalidateQueries({ queryKey: ['current-focus-entry', profileId] });
    },
  });

  return {
    focus: query.data,
    isLoading: query.isLoading,
    updateFocus: updateFocusMutation.mutate,
    updateFocusAsync: updateFocusMutation.mutateAsync,
    isUpdating: updateFocusMutation.isPending,
  };
}

// Hook to get the current focus entry for attaching to notes/sessions
export function useCurrentFocusEntry() {
  const { focus, isLoading } = useTodaysFocus();
  const { profile } = useAuth();

  // Combine DB focus with draft/cache for attachment safety
  return {
    data: focus as (DailyFocus & { isCarriedForward?: boolean }) | null | undefined,
    isLoading,
    isPending: isLoading,
    profileId: profile?.id,
  };
}

// Hook to fetch all focus entries for history view
export function useFocusHistory() {
  const { profile } = useAuth();
  const profileId = profile?.id;

  return useQuery({
    queryKey: ['focus-history', profileId],
    queryFn: async () => {
      if (!profileId) return [];

      const { data, error } = await supabase
        .from('daily_focus')
        .select('id, user_id, focus_date, focus_text, created_at, updated_at')
        .eq('user_id', profileId)
        .order('focus_date', { ascending: false });

      if (error) throw error;
      return data as DailyFocus[];
    },
    enabled: !!profileId,
  });
}

// Hook to fetch all focus dates for filtering
export function useFocusDates() {
  const { profile } = useAuth();
  const profileId = profile?.id;

  return useQuery({
    queryKey: ['focus-dates', profileId],
    queryFn: async () => {
      if (!profileId) return [];

      const { data, error } = await supabase
        .from('daily_focus')
        .select('focus_date')
        .eq('user_id', profileId)
        .order('focus_date', { ascending: false });

      if (error) throw error;
      return data.map((d) => d.focus_date) as string[];
    },
    enabled: !!profileId,
  });
}
