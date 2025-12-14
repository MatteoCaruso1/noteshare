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
            practice_sessions!notes_session_id_fkey (*)
          `)
          .eq('project_id', projectId)
          .order('created_at', { ascending: false });

        if (error) throw error;

        return data.map((note: any) => ({
          ...note,
          author: note.profiles,
          session: note.practice_sessions,
        })) as NoteWithAuthor[];
      }

      // For personal journal (My Journal), only show current user's notes
      if (!profile?.id) return [];
      
      const { data, error } = await supabase
        .from('notes')
        .select(`
          *,
          profiles!notes_author_id_fkey (*),
          practice_sessions!notes_session_id_fkey (*)
        `)
        .eq('author_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map((note: any) => ({
        ...note,
        author: note.profiles,
        session: note.practice_sessions,
      })) as NoteWithAuthor[];
    },
    enabled: projectId ? true : !!profile?.id,
    staleTime: 30 * 1000, // Consider data fresh for 30 seconds
  });
}

export function useNote(noteId: string) {
  return useQuery({
    queryKey: ['note', noteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notes')
        .select(`
          *,
          profiles!notes_author_id_fkey (*)
        `)
        .eq('id', noteId)
        .single();

      if (error) throw error;

      return {
        ...data,
        author: data.profiles,
      } as NoteWithAuthor;
    },
    enabled: !!noteId,
  });
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
      visibility = 'friends',
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
      visibility?: 'private' | 'friends';
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
          visibility,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      toast.success('Note saved!');
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
