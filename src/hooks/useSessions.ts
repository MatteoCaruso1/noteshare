import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PracticeSession } from '@/types';

export function useSessions() {
  return useQuery({
    queryKey: ['sessions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('practice_sessions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as PracticeSession[];
    },
  });
}

export function useActiveSession() {
  return useQuery({
    queryKey: ['active-session'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('practice_sessions')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      return data as PracticeSession | null;
    },
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

      // Create new session
      const { data, error } = await supabase
        .from('practice_sessions')
        .insert({
          user_id: userId,
          goals,
          is_active: true,
          // Use client time so the UI timer starts immediately (avoids server/client clock skew)
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data as PracticeSession;
    },
    onMutate: async ({ userId, goals }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['active-session'] });

      // Snapshot the previous value
      const previousSession = queryClient.getQueryData(['active-session']);

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
      };

      queryClient.setQueryData(['active-session'], optimisticSession);

      return { previousSession };
    },
    onSuccess: (data) => {
      // Replace optimistic data with real data
      queryClient.setQueryData(['active-session'], data);
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      toast.success('Practice session started!');
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousSession !== undefined) {
        queryClient.setQueryData(['active-session'], context.previousSession);
      }
      console.error('Error starting session:', error);
      toast.error('Failed to start session');
    },
  });
}

export function useEndSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ sessionId, notesSummary }: { sessionId: string; notesSummary?: string }) => {
      const { data, error } = await supabase
        .from('practice_sessions')
        .update({
          is_active: false,
          ended_at: new Date().toISOString(),
          notes_summary: notesSummary,
          paused_at: null, // Clear pause state when ending
        })
        .eq('id', sessionId)
        .select()
        .single();

      if (error) throw error;
      return data as PracticeSession;
    },
    onMutate: async () => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['active-session'] });

      // Snapshot the previous value
      const previousSession = queryClient.getQueryData(['active-session']);

      // Optimistically set active session to null immediately
      queryClient.setQueryData(['active-session'], null);

      return { previousSession };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['active-session'] });
      queryClient.invalidateQueries({ queryKey: ['practice-stats'] });
      toast.success('Practice session ended!');
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousSession !== undefined) {
        queryClient.setQueryData(['active-session'], context.previousSession);
      }
      console.error('Error ending session:', error);
      toast.error('Failed to end session');
    },
  });
}

export function usePauseSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-session'] });
      toast.success('Session paused');
    },
    onError: (error) => {
      console.error('Error pausing session:', error);
      toast.error('Failed to pause session');
    },
  });
}

export function useResumeSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-session'] });
      toast.success('Session resumed');
    },
    onError: (error) => {
      console.error('Error resuming session:', error);
      toast.error('Failed to resume session');
    },
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
      const startedAt = new Date(date);
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

      // Create a note for this session if there's content
      if (noteText || (tags && tags.length > 0)) {
        const { error: noteError } = await supabase
          .from('notes')
          .insert({
            author_id: userId,
            session_id: session.id,
            text_content: noteText,
            tags: tags || [],
            visibility: 'friends',
          });

        if (noteError) throw noteError;
      }

      return session as PracticeSession;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['practice-stats'] });
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
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase
        .from('practice_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;
    },
    onMutate: async () => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['active-session'] });

      // Snapshot the previous value
      const previousSession = queryClient.getQueryData(['active-session']);

      // Optimistically set active session to null immediately
      queryClient.setQueryData(['active-session'], null);

      return { previousSession };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['active-session'] });
      queryClient.invalidateQueries({ queryKey: ['practice-stats'] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      toast.success('Session deleted');
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousSession !== undefined) {
        queryClient.setQueryData(['active-session'], context.previousSession);
      }
      console.error('Error deleting session:', error);
      toast.error('Failed to delete session');
    },
  });
}
