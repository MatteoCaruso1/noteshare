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
        })
        .select()
        .single();

      if (error) throw error;
      return data as PracticeSession;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['active-session'] });
      toast.success('Practice session started!');
    },
    onError: (error) => {
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
        })
        .eq('id', sessionId)
        .select()
        .single();

      if (error) throw error;
      return data as PracticeSession;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['active-session'] });
      queryClient.invalidateQueries({ queryKey: ['practice-stats'] }); // Recompute stats on session end
      toast.success('Practice session ended!');
    },
    onError: (error) => {
      console.error('Error ending session:', error);
      toast.error('Failed to end session');
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['active-session'] });
      queryClient.invalidateQueries({ queryKey: ['practice-stats'] }); // Recompute stats on delete
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      toast.success('Session deleted');
    },
    onError: (error) => {
      console.error('Error deleting session:', error);
      toast.error('Failed to delete session');
    },
  });
}

