import { useCallback, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { NoteWithAuthor, Profile } from '@/types';
import { useAuth } from './useAuth';
import { ApplauseWithProfile } from './useApplause';

// Batch-fetch applause for multiple notes and seed the query cache
export async function batchFetchApplause(noteIds: string[]): Promise<Map<string, ApplauseWithProfile[]>> {
  if (noteIds.length === 0) return new Map();
  
  const { data, error } = await supabase
    .from('applause')
    .select(`
      id,
      note_id,
      user_id,
      created_at,
      profile:profiles!applause_user_id_fkey(id, name, avatar)
    `)
    .in('note_id', noteIds)
    .order('created_at', { ascending: true });

  if (error || !data) return new Map();

  const map = new Map<string, ApplauseWithProfile[]>();
  // Initialize all noteIds with empty arrays so we cache "no applause" too
  noteIds.forEach(id => map.set(id, []));
  (data as unknown as ApplauseWithProfile[]).forEach(a => {
    const list = map.get(a.note_id) || [];
    list.push(a);
    map.set(a.note_id, list);
  });
  return map;
}

// Helper to fetch collaborator profiles for sessions
async function fetchCollaboratorProfiles(notes: any[]): Promise<Map<string, Profile[]>> {
  // Collect all unique collaborator IDs from all sessions
  const allCollaboratorIds = new Set<string>();
  notes.forEach(note => {
    const collaboratorIds = note.practice_sessions?.collaborator_ids;
    if (collaboratorIds && Array.isArray(collaboratorIds)) {
      collaboratorIds.forEach((id: string) => allCollaboratorIds.add(id));
    }
  });
  
  if (allCollaboratorIds.size === 0) {
    return new Map();
  }
  
  // Fetch only the fields needed for display
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, user_id, name, username, avatar, current_streak')
    .in('id', Array.from(allCollaboratorIds));
  
  if (error || !profiles) {
    console.error('Error fetching collaborator profiles:', error);
    return new Map();
  }
  
  // Create a map of profile ID to profile
  const profileMap = new Map<string, Profile>();
  profiles.forEach(p => profileMap.set(p.id, p as Profile));
  
  // Create a map of note ID to collaborator profiles
  const noteCollaboratorsMap = new Map<string, Profile[]>();
  notes.forEach(note => {
    const collaboratorIds = note.practice_sessions?.collaborator_ids;
    if (collaboratorIds && Array.isArray(collaboratorIds)) {
      const collaborators = collaboratorIds
        .map((id: string) => profileMap.get(id))
        .filter((p): p is Profile => !!p);
      if (collaborators.length > 0) {
        noteCollaboratorsMap.set(note.id, collaborators);
      }
    }
  });
  
  return noteCollaboratorsMap;
}

export function useNotes(projectId?: string) {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();
  const seededNoteIdsRef = useRef(new Set<string>());
  
  const query = useQuery({
    queryKey: ['notes', projectId, userId],
    queryFn: async () => {
      // If viewing a project, get all notes for that project the user can see
      if (projectId) {
        const { data, error } = await supabase
          .from('notes')
          .select(`
            id, author_id, session_id, project_id, goal_id, gig_id, focus_entry_id, focus_date, focus_text_snapshot,
            text_content, tags, visibility, comment_count, created_at, updated_at,
            audio_files, audio_file_names, image_files, video_files,
            profiles!notes_author_id_fkey (id, user_id, name, username, avatar, current_streak, color_theme),
            practice_sessions!notes_session_id_fkey (id, user_id, started_at, ended_at, paused_duration_ms, collaborator_ids, is_active, paused_at),
            projects!notes_project_id_fkey (id, title),
            goals!notes_goal_id_fkey (id, title, content),
            promo_posts!notes_gig_id_fkey (id, title)
          `)
          .eq('project_id', projectId)
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Fetch collaborator profiles
        const collaboratorsMap = await fetchCollaboratorProfiles(data);

        return data.map((note: any) => ({
          ...note,
          author: note.profiles,
          session: note.practice_sessions,
          sessionCollaborators: collaboratorsMap.get(note.id) || null,
          project: note.projects,
          goal: note.goals,
          gig: note.promo_posts,
        })) as NoteWithAuthor[];
      }

      // For personal journal (My Journal), only show current user's notes
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from('notes')
        .select(`
          id, author_id, session_id, project_id, goal_id, gig_id, focus_entry_id, focus_date, focus_text_snapshot,
          text_content, tags, visibility, comment_count, created_at, updated_at,
          audio_files, audio_file_names, image_files, video_files,
          profiles!notes_author_id_fkey (id, user_id, name, username, avatar, current_streak, color_theme),
          practice_sessions!notes_session_id_fkey (id, user_id, started_at, ended_at, paused_duration_ms, collaborator_ids, is_active, paused_at),
          projects!notes_project_id_fkey (id, title),
          goals!notes_goal_id_fkey (id, title, content),
          promo_posts!notes_gig_id_fkey (id, title)
        `)
      .eq('author_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Fetch collaborator profiles
      const collaboratorsMap = await fetchCollaboratorProfiles(data);

      return data.map((note: any) => ({
        ...note,
        author: note.profiles,
        session: note.practice_sessions,
        sessionCollaborators: collaboratorsMap.get(note.id) || null,
        project: note.projects,
        goal: note.goals,
        gig: note.promo_posts,
      })) as NoteWithAuthor[];
    },
    // Require both profile AND a valid session to ensure auth token is propagated
    enabled: !!userId,
    // Keep data visible during refetch - prevents "no notes" flash
    staleTime: 2 * 60 * 1000, // Consider fresh for 2 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    // Keep previous data visible while refetching
    placeholderData: (previousData) => previousData,
    // Don't refetch on window focus - staleTime handles freshness
    refetchOnWindowFocus: false,
    // Retry configuration for slow networks
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });

  // Batch-prefetch applause for all loaded notes to prevent layout shift
  useEffect(() => {
    if (!query.data?.length) return;
    
    // Only seed notes we haven't seeded yet
    const unseededIds = query.data
      .map(n => n.id)
      .filter(id => !seededNoteIdsRef.current.has(id));
    
    if (unseededIds.length === 0) return;
    
    batchFetchApplause(unseededIds).then(applauseMap => {
      applauseMap.forEach((applauseList, noteId) => {
        queryClient.setQueryData(['applause', noteId], applauseList);
        seededNoteIdsRef.current.add(noteId);
      });
    });
  }, [query.data, queryClient]);

  return query;
}

// Shared query function for note fetching - reusable for prefetch
async function fetchNote(noteId: string) {
  const { data, error } = await supabase
    .from('notes')
    .select(`
      *,
      profiles!notes_author_id_fkey (id, user_id, name, username, avatar, current_streak, color_theme),
      practice_sessions!notes_session_id_fkey (id, user_id, started_at, ended_at, paused_duration_ms, collaborator_ids, is_active, paused_at, goals, notes_summary, focus_text_snapshot),
      projects!notes_project_id_fkey (id, title),
      goals!notes_goal_id_fkey (id, title, content),
      promo_posts!notes_gig_id_fkey (id, title)
    `)
    .eq('id', noteId)
    .single();

  if (error) throw error;

  // Fetch collaborator profiles if session has any
  let sessionCollaborators: Profile[] | null = null;
  const collaboratorIds = data.practice_sessions?.collaborator_ids;
  if (collaboratorIds && Array.isArray(collaboratorIds) && collaboratorIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, user_id, name, username, avatar, current_streak')
      .in('id', collaboratorIds);
    
    if (profiles) {
      sessionCollaborators = profiles as Profile[];
    }
  }

  return {
    ...data,
    author: data.profiles as any,
    session: data.practice_sessions as any,
    sessionCollaborators,
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

export function useCreateNote(onNoteCreated?: (noteId: string, totalNoteCount: number) => void) {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

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
    onSuccess: async (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      // Quick notes count towards streak, so refresh practice stats to update streak immediately
      queryClient.invalidateQueries({ queryKey: ['practice-stats'] });
      // Invalidate daily note count so limit is enforced across all components
      queryClient.invalidateQueries({ queryKey: ['daily-note-count'] });
      // Show appropriate message based on whether this is a session note
      toast.success(variables.sessionId ? 'Practice session saved' : 'Note saved!');
      
      // If callback provided, fetch total note count and call it
      if (onNoteCreated && profile?.id) {
        const { count } = await supabase
          .from('notes')
          .select('id', { count: 'exact', head: true })
          .eq('author_id', profile.id);
        
        if (count !== null) {
          onNoteCreated(data.id, count);
        }
      }
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
          id, author_id, text_content, tags, visibility, comment_count, created_at,
          audio_files, audio_file_names, image_files, video_files,
          profiles!notes_author_id_fkey (id, user_id, name, username, avatar, current_streak, color_theme)
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
