import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { NoteWithAuthor } from '@/types';

export function useUpdateNoteVisibility() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      noteId,
      visibility,
    }: {
      noteId: string;
      visibility: 'private' | 'friends';
    }) => {
      const { data, error } = await supabase
        .from('notes')
        .update({ visibility, updated_at: new Date().toISOString() })
        .eq('id', noteId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    // Optimistic update for instant UI feedback
    onMutate: async ({ noteId, visibility }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['note', noteId] });
      await queryClient.cancelQueries({ queryKey: ['notes'] });

      // Snapshot the previous value
      const previousNote = queryClient.getQueryData<NoteWithAuthor>(['note', noteId]);

      // Optimistically update the single note query
      if (previousNote) {
        queryClient.setQueryData<NoteWithAuthor>(['note', noteId], {
          ...previousNote,
          visibility,
        });
      }

      // Optimistically update notes in lists
      queryClient.setQueriesData<NoteWithAuthor[]>(
        { queryKey: ['notes'], exact: false },
        (old) => old?.map(note => 
          note.id === noteId ? { ...note, visibility } : note
        )
      );

      return { previousNote };
    },
    onError: (error, { noteId }, context) => {
      // Roll back on error
      if (context?.previousNote) {
        queryClient.setQueryData(['note', noteId], context.previousNote);
      }
      console.error('Error updating visibility:', error);
      toast.error('Failed to update visibility');
    },
    onSuccess: (_, { noteId }) => {
      // Invalidate to ensure consistency with server
      queryClient.invalidateQueries({ queryKey: ['note', noteId] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['friends-notes'] });
      toast.success('Visibility updated');
    },
  });
}

export function useRemoveNoteFocus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (noteId: string) => {
      const { data, error } = await supabase
        .from('notes')
        .update({ 
          focus_entry_id: null,
          focus_date: null,
          focus_text_snapshot: null,
          updated_at: new Date().toISOString() 
        })
        .eq('id', noteId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['friends-notes'] });
      queryClient.invalidateQueries({ queryKey: ['note'] });
      toast.success('Focus removed from note');
    },
    onError: (error) => {
      console.error('Error removing focus:', error);
      toast.error('Failed to remove focus');
    },
  });
}

export function useUpdateNoteTags() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      noteId,
      tags,
    }: {
      noteId: string;
      tags: string[];
    }) => {
      const { data, error } = await supabase
        .from('notes')
        .update({ tags, updated_at: new Date().toISOString() })
        .eq('id', noteId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    // Optimistic update for instant UI feedback
    onMutate: async ({ noteId, tags }) => {
      await queryClient.cancelQueries({ queryKey: ['note', noteId] });
      await queryClient.cancelQueries({ queryKey: ['notes'] });

      const previousNote = queryClient.getQueryData<NoteWithAuthor>(['note', noteId]);

      if (previousNote) {
        queryClient.setQueryData<NoteWithAuthor>(['note', noteId], {
          ...previousNote,
          tags,
        });
      }

      queryClient.setQueriesData<NoteWithAuthor[]>(
        { queryKey: ['notes'], exact: false },
        (old) => old?.map(note => 
          note.id === noteId ? { ...note, tags } : note
        )
      );

      return { previousNote };
    },
    onError: (error, { noteId }, context) => {
      if (context?.previousNote) {
        queryClient.setQueryData(['note', noteId], context.previousNote);
      }
      console.error('Error updating tags:', error);
      toast.error('Failed to update tags');
    },
    onSuccess: (_, { noteId }) => {
      queryClient.invalidateQueries({ queryKey: ['note', noteId] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['friends-notes'] });
    queryClient.invalidateQueries({ queryKey: ['recent-tags'] });
  },
});
}

export function useUpdateNoteAudioNames() {
const queryClient = useQueryClient();

return useMutation({
  mutationFn: async ({
    noteId,
    audioFileNames,
  }: {
    noteId: string;
    audioFileNames: string[];
  }) => {
    const { data, error } = await supabase
      .from('notes')
      .update({ audio_file_names: audioFileNames, updated_at: new Date().toISOString() })
      .eq('id', noteId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
  // Optimistic update for instant UI feedback
  onMutate: async ({ noteId, audioFileNames }) => {
    await queryClient.cancelQueries({ queryKey: ['note', noteId] });
    await queryClient.cancelQueries({ queryKey: ['notes'] });

    const previousNote = queryClient.getQueryData<NoteWithAuthor>(['note', noteId]);

    if (previousNote) {
      queryClient.setQueryData<NoteWithAuthor>(['note', noteId], {
        ...previousNote,
        audio_file_names: audioFileNames,
      });
    }

    queryClient.setQueriesData<NoteWithAuthor[]>(
      { queryKey: ['notes'], exact: false },
      (old) => old?.map(note => 
        note.id === noteId ? { ...note, audio_file_names: audioFileNames } : note
      )
    );

    return { previousNote };
  },
  onError: (error, { noteId }, context) => {
    if (context?.previousNote) {
      queryClient.setQueryData(['note', noteId], context.previousNote);
    }
    console.error('Error updating audio names:', error);
    toast.error('Failed to rename audio');
  },
  onSuccess: (_, { noteId }) => {
    queryClient.invalidateQueries({ queryKey: ['note', noteId] });
    queryClient.invalidateQueries({ queryKey: ['notes'] });
    queryClient.invalidateQueries({ queryKey: ['friends-notes'] });
  },
});
}

export function useUpdateNoteContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      noteId,
      textContent,
      focusTextSnapshot,
      audioFiles,
      audioFileNames,
      imageFiles,
    }: {
      noteId: string;
      textContent?: string;
      focusTextSnapshot?: string | null;
      audioFiles?: string[];
      audioFileNames?: string[];
      imageFiles?: string[];
    }) => {
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      
      if (textContent !== undefined) {
        updateData.text_content = textContent;
      }
      if (focusTextSnapshot !== undefined) {
        updateData.focus_text_snapshot = focusTextSnapshot;
      }
      if (audioFiles !== undefined) {
        updateData.audio_files = audioFiles;
      }
      if (audioFileNames !== undefined) {
        updateData.audio_file_names = audioFileNames;
      }
      if (imageFiles !== undefined) {
        updateData.image_files = imageFiles;
      }

      const { data, error } = await supabase
        .from('notes')
        .update(updateData)
        .eq('id', noteId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async ({ noteId, textContent, focusTextSnapshot, audioFiles, audioFileNames, imageFiles }) => {
      await queryClient.cancelQueries({ queryKey: ['note', noteId] });
      await queryClient.cancelQueries({ queryKey: ['notes'] });

      const previousNote = queryClient.getQueryData<NoteWithAuthor>(['note', noteId]);

      if (previousNote) {
        const updatedNote = { ...previousNote };
        if (textContent !== undefined) updatedNote.text_content = textContent;
        if (focusTextSnapshot !== undefined) updatedNote.focus_text_snapshot = focusTextSnapshot;
        if (audioFiles !== undefined) updatedNote.audio_files = audioFiles;
        if (audioFileNames !== undefined) updatedNote.audio_file_names = audioFileNames;
        if (imageFiles !== undefined) updatedNote.image_files = imageFiles;
        queryClient.setQueryData<NoteWithAuthor>(['note', noteId], updatedNote);
      }

      queryClient.setQueriesData<NoteWithAuthor[]>(
        { queryKey: ['notes'], exact: false },
        (old) => old?.map(note => {
          if (note.id !== noteId) return note;
          const updated = { ...note };
          if (textContent !== undefined) updated.text_content = textContent;
          if (focusTextSnapshot !== undefined) updated.focus_text_snapshot = focusTextSnapshot;
          if (audioFiles !== undefined) updated.audio_files = audioFiles;
          if (audioFileNames !== undefined) updated.audio_file_names = audioFileNames;
          if (imageFiles !== undefined) updated.image_files = imageFiles;
          return updated;
        })
      );

      return { previousNote };
    },
    onError: (error, { noteId }, context) => {
      if (context?.previousNote) {
        queryClient.setQueryData(['note', noteId], context.previousNote);
      }
      console.error('Error updating note content:', error);
      toast.error('Failed to update note');
    },
    onSuccess: (_, { noteId }) => {
      queryClient.invalidateQueries({ queryKey: ['note', noteId] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['friends-notes'] });
      toast.success('Note updated');
    },
  });
}