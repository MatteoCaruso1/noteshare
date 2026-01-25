import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { NoteWithAuthor, Profile } from '@/types';
import { useAuth } from './useAuth';

export function useNotes(projectId?: string) {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ['notes', projectId, profile?.id],
    queryFn: async () => {
      // If viewing a project, get all notes for that project the user can see
      if (projectId) {
        const { data, error } = await supabase
          .from('notes')
          .select(`
            *,
            profiles!notes_author_id_fkey (*),
            practice_sessions!notes_session_id_fkey (*),
            projects!notes_project_id_fkey (id, title),
            goals!notes_goal_id_fkey (id, title, content),
            promo_posts!notes_gig_id_fkey (id, title)
          `)
          .eq('project_id', projectId)
          .order('created_at', { ascending: false });

        if (error) throw error;

        return data.map((note: any) => ({
          ...note,
          author: note.profiles,
          session: note.practice_sessions,
          project: note.projects,
          goal: note.goals,
          gig: note.promo_posts,
        })) as NoteWithAuthor[];
      }

      // For personal journal (My Journal), only show current user's notes
      if (!profile?.id) return [];
      
      const { data, error } = await supabase
        .from('notes')
        .select(`
          *,
          profiles!notes_author_id_fkey (*),
          practice_sessions!notes_session_id_fkey (*),
          projects!notes_project_id_fkey (id, title),
          goals!notes_goal_id_fkey (id, title, content),
          promo_posts!notes_gig_id_fkey (id, title)
        `)
        .eq('author_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map((note: any) => ({
        ...note,
        author: note.profiles,
        session: note.practice_sessions,
        project: note.projects,
        goal: note.goals,
        gig: note.promo_posts,
      })) as NoteWithAuthor[];
    },
    enabled: projectId ? true : !!profile?.id,
    // Keep data visible during refetch - prevents "no notes" flash
    staleTime: 2 * 60 * 1000, // Consider fresh for 2 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    // Keep previous data visible while refetching
    placeholderData: (previousData) => previousData,
    // Refetch on focus but don't remove existing data
    refetchOnWindowFocus: true,
    // Retry configuration for slow networks
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });
}

// Shared query function for note fetching - reusable for prefetch
async function fetchNote(noteId: string) {
  const { data, error } = await supabase
    .from('notes')
    .select(`
      *,
      profiles!notes_author_id_fkey (*),
      practice_sessions!notes_session_id_fkey (*),
      projects!notes_project_id_fkey (id, title),
      goals!notes_goal_id_fkey (id, title, content),
      promo_posts!notes_gig_id_fkey (id, title)
    `)
    .eq('id', noteId)
    .single();

  if (error) throw error;

  return {
    ...data,
    author: data.profiles,
    session: data.practice_sessions,
    project: data.projects,
    goal: data.goals,
    gig: data.promo_posts,
  } as NoteWithAuthor;
}

export function useNote(noteId: string) {
  return useQuery({
    queryKey: ['note', noteId],
    queryFn: () => fetchNote(noteId),
    enabled: !!noteId,
    staleTime: 30 * 1000, // Consider data fresh for 30 seconds
  });
}

// Prefetch a note on hover - call this from NoteCard
export function usePrefetchNote() {
  const queryClient = useQueryClient();
  
  return useCallback((noteId: string) => {
    queryClient.prefetchQuery({
      queryKey: ['note', noteId],
      queryFn: () => fetchNote(noteId),
      staleTime: 30 * 1000,
    });
  }, [queryClient]);
}

export function useCreateNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      authorId,
      textContent,
      audioFiles = [],
      audioFileNames = [],
      imageFiles = [],
      videoFiles = [],
      tags = [],
      sessionId,
      projectId,
      goalId,
      gigId,
      visibility = 'friends',
      focusEntryId,
      focusDate,
      focusTextSnapshot,
    }: {
      authorId: string;
      textContent?: string;
      audioFiles?: string[];
      audioFileNames?: string[];
      imageFiles?: string[];
      videoFiles?: string[];
      tags?: string[];
      sessionId?: string;
      projectId?: string;
      goalId?: string;
      gigId?: string;
      visibility?: 'private' | 'friends';
      focusEntryId?: string;
      focusDate?: string;
      focusTextSnapshot?: string;
    }) => {
      const { data, error } = await supabase
        .from('notes')
        .insert({
          author_id: authorId,
          text_content: textContent,
          audio_files: audioFiles,
          audio_file_names: audioFileNames,
          image_files: imageFiles,
          video_files: videoFiles,
          tags,
          session_id: sessionId,
          project_id: projectId,
          goal_id: goalId,
          gig_id: gigId,
          visibility,
          focus_entry_id: focusEntryId,
          focus_date: focusDate,
          focus_text_snapshot: focusTextSnapshot,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      // Quick notes count towards streak, so refresh practice stats to update streak immediately
      queryClient.invalidateQueries({ queryKey: ['practice-stats'] });
      // Invalidate daily note count so limit is enforced across all components
      queryClient.invalidateQueries({ queryKey: ['daily-note-count'] });
      // Show appropriate message based on whether this is a session note
      toast.success(variables.sessionId ? 'Practice session saved' : 'Note saved!');
    },
    onError: (error) => {
      console.error('Error creating note:', error);
      toast.error('Failed to save note');
    },
  });
}

export function useDeleteNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ noteId, sessionId }: { noteId: string; sessionId?: string | null }) => {
      // Delete the note
      const { error: noteError } = await supabase
        .from('notes')
        .delete()
        .eq('id', noteId);

      if (noteError) throw noteError;

      // If this note was linked to a session, delete the session too
      if (sessionId) {
        const { error: sessionError } = await supabase
          .from('practice_sessions')
          .delete()
          .eq('id', sessionId);

        if (sessionError) {
          console.error('Error deleting session:', sessionError);
          // Don't throw - the note was already deleted
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      queryClient.invalidateQueries({ queryKey: ['practice-stats'] });
      toast.success('Note deleted');
    },
    onError: (error) => {
      console.error('Error deleting note:', error);
      toast.error('Failed to delete note');
    },
  });
}

export function useMemoryNotes() {
  return useQuery({
    queryKey: ['memory-notes'],
    queryFn: async () => {
      const now = new Date();
      const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
      const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

      // Get notes from exactly 1 year, 6 months, or 1 month ago (within a day range)
      const { data, error } = await supabase
        .from('notes')
        .select(`
          *,
          profiles!notes_author_id_fkey (*)
        `)
        .or(`created_at.gte.${oneYearAgo.toISOString().split('T')[0]},created_at.gte.${sixMonthsAgo.toISOString().split('T')[0]},created_at.gte.${oneMonthAgo.toISOString().split('T')[0]}`)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      return data.map((note: any) => ({
        ...note,
        author: note.profiles,
      })) as NoteWithAuthor[];
    },
  });
}
