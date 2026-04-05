import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PracticeSession } from '@/types';
import { isOnboardingActive } from '@/contexts/OnboardingContext';
import { enqueue } from '@/lib/offlineQueue';
import { isOffline } from '@/hooks/useNetworkStatus';

const ACTIVE_SESSION_STORAGE_KEY = 'noteshare_active_session';

// Persist active session to localStorage for instant restore on app resume
function persistActiveSession(session: PracticeSession | null, profileId?: string) {
  if (!profileId) return;
  
  if (session) {
    localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, JSON.stringify({ session, profileId }));
  } else {
    localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
  }
}

// Get persisted active session from localStorage
function getPersistedActiveSession(profileId?: string): PracticeSession | null {
  if (!profileId) return null;
  
  try {
    const stored = localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY);
    if (!stored) return null;
    
    const { session, profileId: storedProfileId } = JSON.parse(stored);
    // Only return if it matches current profile and is active
    if (storedProfileId === profileId && session?.is_active) {
      return session as PracticeSession;
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

export function useSessions() {
  return useQuery({
    queryKey: ['sessions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('practice_sessions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(365);

      if (error) throw error;
      return data as PracticeSession[];
    },
  });
}

export function useActiveSession(profileId?: string) {
  const queryClient = useQueryClient();
  
  return useQuery({
    queryKey: ['active-session', profileId],
    queryFn: async () => {
      if (!profileId) return null;

      const { data, error } = await supabase
        .from('practice_sessions')
        .select('*')
        .eq('user_id', profileId)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      
      // Persist to localStorage for instant restore
      persistActiveSession(data as PracticeSession | null, profileId);
      
      return data as PracticeSession | null;
    },
    enabled: !!profileId,
    // Use persisted session as initial data for instant display
    initialData: () => getPersistedActiveSession(profileId),
    // Keep data fresh but don't throw away stale data while refetching
    staleTime: 60 * 1000, // Consider fresh for 1 minute
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    // Don't refetch on mount if we have data (prevents flicker)
    refetchOnMount: (query) => query.state.data === undefined,
  });
}

export function useRecentSessionNotes(profileId: string | undefined) {
  return useQuery({
    queryKey: ['recent-session-notes', profileId],
    queryFn: async () => {
      if (!profileId) return [];
      
      // Get last 3 practice sessions with notes
      const { data: sessions, error: sessionsError } = await supabase
        .from('practice_sessions')
        .select('id, notes_summary, goals')
        .eq('user_id', profileId)
        .not('ended_at', 'is', null)
        .order('ended_at', { ascending: false })
        .limit(3);

      if (sessionsError) throw sessionsError;

      // Get notes from those sessions
      const sessionIds = sessions?.map(s => s.id) || [];
      if (sessionIds.length === 0) return [];

      const { data: notes, error: notesError } = await supabase
        .from('notes')
        .select('text_content, tags')
        .in('session_id', sessionIds)
        .not('text_content', 'is', null);

      if (notesError) throw notesError;

      // Extract unique suggestions from notes and session summaries
      const suggestions = new Set<string>();
      
      sessions?.forEach(s => {
        if (s.notes_summary) suggestions.add(s.notes_summary);
        if (s.goals) suggestions.add(s.goals);
      });
      
      notes?.forEach(n => {
        if (n.text_content && n.text_content.length < 100) {
          suggestions.add(n.text_content);
        }
      });

      return Array.from(suggestions).slice(0, 5);
    },
    enabled: !!profileId,
  });
}

export function useStartSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, goals }: { userId: string; goals?: string }) => {
      // First, end any existing active sessions
      await supabase
        .from('practice_sessions')
        .update({ is_active: false, ended_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('is_active', true);

      // Detect mobile - use multiple signals for reliability
      const userAgentMobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const uaDataMobile = !!(navigator as any).userAgentData?.mobile;
      const touchDevice = navigator.maxTouchPoints > 0 && window.innerWidth <= 1024;
      // iPadOS reports as "Macintosh" but has touch support
      const isIPad = /Macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1;
      const isMobile = userAgentMobile || uaDataMobile || touchDevice || isIPad;

      // Create new session
      const { data, error } = await supabase
        .from('practice_sessions')
        .insert({
          user_id: userId,
          goals,
          is_active: true,
          started_at: new Date().toISOString(),
          is_mobile: isMobile,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data as PracticeSession;
    },
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * (attempt + 1), 3000),
    onMutate: async ({ userId, goals }) => {
      const key = ['active-session', userId] as const;

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: key });

      // Snapshot the previous value
      const previousSession = queryClient.getQueryData(key);

      // Optimistically set the new session immediately
      const optimisticSession: PracticeSession = {
        id: 'optimistic-' + Date.now(),
        user_id: userId,
        started_at: new Date().toISOString(),
        ended_at: null,
        goals: goals || null,
        notes_summary: null,
        is_active: true,
        created_at: new Date().toISOString(),
        paused_at: null,
        paused_duration_ms: 0,
        collaborator_ids: null,
      };

      queryClient.setQueryData(key, optimisticSession);
      // Also persist optimistically
      persistActiveSession(optimisticSession, userId);

      return { previousSession, key };
    },
    onSuccess: (data, { userId }) => {
      const key = ['active-session', userId] as const;
      // Replace optimistic data with real data
      queryClient.setQueryData(key, data);
      // Persist real session to localStorage
      persistActiveSession(data, userId);
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      if (!isOnboardingActive) {
        toast.success('Practice session started!');
      }
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.key && context?.previousSession !== undefined) {
        queryClient.setQueryData(context.key, context.previousSession);
        persistActiveSession(context.previousSession as PracticeSession | null, variables.userId);
      }
      console.error('Error starting session:', error);
      toast.error('Failed to start session');
    },
  });
}

export function useEndSession() {
  const queryClient = useQueryClient();

  return useMutation({
    retry: 1, // Retry once on transient mobile network failures
    mutationFn: async ({
      sessionId,
      userId,
      notesSummary,
      collaboratorIds,
      customDurationMinutes,
    }: {
      sessionId: string;
      userId: string;
      notesSummary?: string;
      collaboratorIds?: string[];
      customDurationMinutes?: number;
    }) => {
      // First, fetch the current session to finalize pause time
      const { data: currentSession, error: fetchError } = await supabase
        .from('practice_sessions')
        .select('started_at, paused_at, paused_duration_ms')
        .eq('id', sessionId)
        .single();

      if (fetchError) throw fetchError;

      // Calculate final paused duration if currently paused
      let finalPausedDurationMs = currentSession?.paused_duration_ms || 0;
      if (currentSession?.paused_at) {
        const pausedAt = new Date(currentSession.paused_at);
        const additionalPausedMs = Date.now() - pausedAt.getTime();
        finalPausedDurationMs += additionalPausedMs;
      }

      // If custom duration provided, calculate ended_at from started_at + custom duration + paused time
      let endedAt: string;
      if (customDurationMinutes !== undefined) {
        const startedAt = new Date(currentSession.started_at);
        endedAt = new Date(startedAt.getTime() + (customDurationMinutes * 60 * 1000) + finalPausedDurationMs).toISOString();
      } else {
        endedAt = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('practice_sessions')
        .update({
          is_active: false,
          ended_at: endedAt,
          notes_summary: notesSummary,
          paused_at: null, // Clear pause state when ending
          paused_duration_ms: finalPausedDurationMs, // Save finalized pause duration
          collaborator_ids: collaboratorIds || [],
        })
        .eq('id', sessionId)
        .select()
        .single();

      if (error) throw error;
      return data as PracticeSession;
    },
    onMutate: async ({ userId }) => {
      const key = ['active-session', userId] as const;

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: key });

      // Snapshot the previous value
      const previousSession = queryClient.getQueryData(key);

      // Optimistically set active session to null immediately
      queryClient.setQueryData(key, null);
      // Clear from localStorage
      persistActiveSession(null, userId);

      return { previousSession, key };
    },
    onSuccess: (_data, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['active-session', userId] });
      queryClient.invalidateQueries({ queryKey: ['practice-stats'] });
      // Note: Don't show toast here - the note creation will show "Practice session saved"
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.key && context?.previousSession !== undefined) {
        queryClient.setQueryData(context.key, context.previousSession);
        // Restore to localStorage
        persistActiveSession(context.previousSession as PracticeSession | null, variables.userId);
      }
      console.error('Error ending session:', error);
      toast.error('Failed to end session');
    },
  });
}

export function usePauseSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sessionId }: { sessionId: string; userId: string }) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      try {
        const { data, error } = await supabase
          .from('practice_sessions')
          .update({
            paused_at: new Date().toISOString(),
          })
          .eq('id', sessionId)
          .select()
          .single();

        if (error) throw error;
        return data as PracticeSession;
      } finally {
        clearTimeout(timeout);
      }
    },
    onMutate: async ({ sessionId, userId }) => {
      const key = ['active-session', userId] as const;

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: key });

      // Snapshot the previous value
      const previousSession = queryClient.getQueryData<PracticeSession | null>(key);

      // Optimistically set paused_at
      if (previousSession) {
        const optimistic = { ...previousSession, paused_at: new Date().toISOString() };
        queryClient.setQueryData(key, optimistic);
        persistActiveSession(optimistic, userId);
      }

      return { previousSession, key, userId };
    },
    onSuccess: (data, { userId }) => {
      const key = ['active-session', userId] as const;
      queryClient.setQueryData(key, data);
      persistActiveSession(data, userId);
      toast.success('Session paused');
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.key && context?.previousSession !== undefined) {
        queryClient.setQueryData(context.key, context.previousSession);
        persistActiveSession(context.previousSession as PracticeSession | null, context.userId);
      }
      console.error('Error pausing session:', error);
      toast.error('Failed to pause session');
    },
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * (attemptIndex + 1), 3000),
  });
}

export function useResumeSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sessionId, userId }: { sessionId: string; userId: string }) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      try {
        // First get the current session to calculate paused duration
        const { data: session, error: fetchError } = await supabase
          .from('practice_sessions')
          .select('paused_at, paused_duration_ms')
          .eq('id', sessionId)
          .single();

        if (fetchError) throw fetchError;

        // Calculate additional paused time
        const pausedAt = session?.paused_at ? new Date(session.paused_at) : null;
        const additionalPausedMs = pausedAt ? Date.now() - pausedAt.getTime() : 0;
        const newPausedDurationMs = (session?.paused_duration_ms || 0) + additionalPausedMs;

        const { data, error } = await supabase
          .from('practice_sessions')
          .update({
            paused_at: null,
            paused_duration_ms: newPausedDurationMs,
          })
          .eq('id', sessionId)
          .select()
          .single();

        if (error) throw error;
        return data as PracticeSession;
      } finally {
        clearTimeout(timeout);
      }
    },
    onMutate: async ({ sessionId, userId }) => {
      const key = ['active-session', userId] as const;

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: key });

      // Snapshot the previous value
      const previousSession = queryClient.getQueryData<PracticeSession | null>(key);

      // Optimistically clear paused_at and compute paused_duration_ms
      if (previousSession && previousSession.paused_at) {
        const pausedAt = new Date(previousSession.paused_at);
        const additionalPausedMs = Date.now() - pausedAt.getTime();
        const newPausedDurationMs = (previousSession.paused_duration_ms || 0) + additionalPausedMs;

        const optimistic = {
          ...previousSession,
          paused_at: null,
          paused_duration_ms: newPausedDurationMs,
        };
        queryClient.setQueryData(key, optimistic);
        persistActiveSession(optimistic, userId);
      }

      return { previousSession, key, userId };
    },
    onSuccess: (data, { userId }) => {
      const key = ['active-session', userId] as const;
      queryClient.setQueryData(key, data);
      persistActiveSession(data, userId);
      toast.success('Session resumed');
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.key && context?.previousSession !== undefined) {
        queryClient.setQueryData(context.key, context.previousSession);
        persistActiveSession(context.previousSession as PracticeSession | null, context.userId);
      }
      console.error('Error resuming session:', error);
      toast.error('Failed to resume session');
    },
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * (attemptIndex + 1), 3000),
  });
}

export function useLogOfflineSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      userId, 
      date, 
      durationMinutes, 
      noteText,
      tags,
      collaboratorIds,
    }: { 
      userId: string; 
      date: string; 
      durationMinutes: number;
      noteText?: string;
      tags?: string[];
      collaboratorIds?: string[];
    }) => {
      // Calculate started_at and ended_at from date and duration
      // Parse date string as local date (YYYY-MM-DD) at noon to avoid timezone shifts
      const [year, month, day] = date.split('-').map(Number);
      const startedAt = new Date(year, month - 1, day, 12, 0, 0);
      const endedAt = new Date(startedAt.getTime() + durationMinutes * 60 * 1000);

      // Create the session
      const { data: session, error: sessionError } = await supabase
        .from('practice_sessions')
        .insert({
          user_id: userId,
          started_at: startedAt.toISOString(),
          ended_at: endedAt.toISOString(),
          is_active: false,
          collaborator_ids: collaboratorIds || [],
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Always create a note for the session (even if empty) so it appears on the timeline
      const { error: noteError } = await supabase
        .from('notes')
        .insert({
          author_id: userId,
          session_id: session.id,
          text_content: noteText || null,
          tags: tags || [],
          visibility: 'friends',
          created_at: startedAt.toISOString(),
        });

      if (noteError) throw noteError;

      return session as PracticeSession;
    },
    onSuccess: () => {
      // Use refetchQueries for immediate UI update on the home page
      queryClient.refetchQueries({ queryKey: ['notes'] });
      queryClient.refetchQueries({ queryKey: ['practice-stats'] });
      queryClient.refetchQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['weekly-goal'] });
      toast.success('Practice session logged!');
    },
    onError: (error) => {
      console.error('Error logging session:', error);
      toast.error('Failed to log session');
    },
  });
}

export function useDeleteSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sessionId }: { sessionId: string; userId: string }) => {
      const { error } = await supabase
        .from('practice_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;
    },
    onMutate: async ({ userId }) => {
      const key = ['active-session', userId] as const;

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: key });

      // Snapshot the previous value
      const previousSession = queryClient.getQueryData(key);

      // Optimistically set active session to null immediately
      queryClient.setQueryData(key, null);
      // Clear from localStorage
      persistActiveSession(null, userId);

      return { previousSession, key };
    },
    onSuccess: (_data, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['active-session', userId] });
      queryClient.invalidateQueries({ queryKey: ['practice-stats'] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      toast.success('Session deleted');
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.key && context?.previousSession !== undefined) {
        queryClient.setQueryData(context.key, context.previousSession);
        // Restore to localStorage
        persistActiveSession(context.previousSession as PracticeSession | null, variables.userId);
      }
      console.error('Error deleting session:', error);
      toast.error('Failed to delete session');
    },
  });
}

export function useUpdateSessionDuration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sessionId,
      durationMinutes,
    }: {
      sessionId: string;
      durationMinutes: number;
    }) => {
      // First get the session to calculate new ended_at
      const { data: session, error: fetchError } = await supabase
        .from('practice_sessions')
        .select('started_at, paused_duration_ms')
        .eq('id', sessionId)
        .single();

      if (fetchError) throw fetchError;

      // Calculate new ended_at based on started_at + duration + paused time
      const startedAt = new Date(session.started_at);
      const pausedMs = session.paused_duration_ms || 0;
      const newEndedAt = new Date(startedAt.getTime() + (durationMinutes * 60 * 1000) + pausedMs);

      const { data, error } = await supabase
        .from('practice_sessions')
        .update({
          ended_at: newEndedAt.toISOString(),
        })
        .eq('id', sessionId)
        .select()
        .single();

      if (error) throw error;
      return data as PracticeSession;
    },
    onSuccess: (updatedSession) => {
      // Update all queries that might contain this session
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['practice-stats'] });
      
      // Invalidate all notes queries (both list and individual)
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['note'] });
      queryClient.invalidateQueries({ queryKey: ['friends-notes'] });
      
      // Also optimistically update any cached notes that reference this session
      queryClient.setQueriesData<any>(
        { queryKey: ['notes'], exact: false },
        (old: any) => {
          if (!old) return old;
          if (Array.isArray(old)) {
            return old.map((note: any) => {
              if (note.session_id === updatedSession.id && note.session) {
                return {
                  ...note,
                  session: {
                    ...note.session,
                    ended_at: updatedSession.ended_at,
                  },
                };
              }
              return note;
            });
          }
          // Single note object
          if (old.session_id === updatedSession.id && old.session) {
            return {
              ...old,
              session: {
                ...old.session,
                ended_at: updatedSession.ended_at,
              },
            };
          }
          return old;
        }
      );
      
      // Also update single note queries
      queryClient.setQueriesData<any>(
        { queryKey: ['note'], exact: false },
        (old: any) => {
          if (!old) return old;
          if (old.session_id === updatedSession.id && old.session) {
            return {
              ...old,
              session: {
                ...old.session,
                ended_at: updatedSession.ended_at,
              },
            };
          }
          return old;
        }
      );
      
      toast.success('Session duration updated');
    },
    onError: (error) => {
      console.error('Error updating session duration:', error);
      toast.error('Failed to update duration');
    },
  });
}
