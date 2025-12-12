import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { NoteWithAuthor } from '@/types';

export function useNotes(projectId?: string) {
  return useQuery({
    queryKey: ['notes', projectId],
    queryFn: async () => {
      let query = supabase
        .from('notes')
        .select(`
          *,
          profiles!notes_author_id_fkey (*)
        `)
        .order('created_at', { ascending: false });

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data.map((note: any) => ({
        ...note,
        author: note.profiles,
      })) as NoteWithAuthor[];
    },
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
      imageFiles = [],
      videoFiles = [],
      tags = [],
      sessionId,
      projectId,
      visibility = 'private',
    }: {
      authorId: string;
      textContent?: string;
      audioFiles?: string[];
      imageFiles?: string[];
      videoFiles?: string[];
      tags?: string[];
      sessionId?: string;
      projectId?: string;
      visibility?: 'private' | 'collaborators' | 'followers' | 'public';
    }) => {
      const { data, error } = await supabase
        .from('notes')
        .insert({
          author_id: authorId,
          text_content: textContent,
          audio_files: audioFiles,
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
    mutationFn: async (noteId: string) => {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
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
