import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { NoteComment } from '@/types';
import { useCallback } from 'react';

interface CommentWithAuthor extends NoteComment {
  author: {
    id: string;
    name: string;
    username: string;
    avatar: string | null;
  };
  audio_url?: string | null;
}

// Shared query function for comments - reusable for prefetch
async function fetchNoteComments(noteId: string) {
  const { data, error } = await supabase
    .from('note_comments')
    .select(`*, profiles!note_comments_author_id_fkey (id, name, username, avatar)`)
    .eq('note_id', noteId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data.map((comment: any) => ({
    ...comment,
    author: comment.profiles,
  })) as CommentWithAuthor[];
}

export function useNoteComments(noteId: string) {
  return useQuery({
    queryKey: ['note-comments', noteId],
    queryFn: () => fetchNoteComments(noteId),
    enabled: !!noteId,
    staleTime: 30 * 1000, // Consider data fresh for 30 seconds
  });
}

// Prefetch comments on hover - call this from NoteCard
export function usePrefetchNoteComments() {
  const queryClient = useQueryClient();
  
  return useCallback((noteId: string) => {
    queryClient.prefetchQuery({
      queryKey: ['note-comments', noteId],
      queryFn: () => fetchNoteComments(noteId),
      staleTime: 30 * 1000,
    });
  }, [queryClient]);
}

export function useCreateNoteComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      noteId,
      authorId,
      content,
      audioUrl,
    }: {
      noteId: string;
      authorId: string;
      content: string;
      audioUrl?: string;
    }) => {
      const { data, error } = await supabase
        .from('note_comments')
        .insert({
          note_id: noteId,
          author_id: authorId,
          content,
          audio_url: audioUrl,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['note-comments', variables.noteId] });
      toast.success('Comment added');
    },
    onError: (error) => {
      console.error('Error creating comment:', error);
      toast.error('Failed to add comment');
    },
  });
}

export function useDeleteNoteComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ commentId, noteId }: { commentId: string; noteId: string }) => {
      const { error } = await supabase
        .from('note_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;
      return { noteId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['note-comments', data.noteId] });
      toast.success('Comment deleted');
    },
    onError: (error) => {
      console.error('Error deleting comment:', error);
      toast.error('Failed to delete comment');
    },
  });
}
