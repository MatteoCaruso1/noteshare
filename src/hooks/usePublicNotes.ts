import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { NoteWithAuthor } from '@/types';

export function usePublicNotes(profileId: string | undefined) {
  return useQuery({
    queryKey: ['public-notes', profileId],
    queryFn: async () => {
      if (!profileId) return [];
      
      const { data, error } = await supabase
        .from('notes')
        .select(`
          id, author_id, session_id, project_id, goal_id, gig_id, focus_entry_id, focus_date, focus_text_snapshot, focus_title_snapshot,
          text_content, tags, visibility, comment_count, created_at, updated_at,
          audio_files, audio_file_names, image_files, video_files, video_path,
          profiles!notes_author_id_fkey (id, user_id, name, username, avatar, current_streak, color_theme, streak_achievement_counts, selected_award),
          practice_sessions!notes_session_id_fkey (id, user_id, started_at, ended_at, paused_duration_ms, collaborator_ids, is_active, paused_at)
        `)
        .eq('author_id', profileId)
        .eq('visibility', 'friends')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      return data.map((note: any) => ({
        ...note,
        author: note.profiles,
        session: note.practice_sessions,
      })) as NoteWithAuthor[];
    },
    enabled: !!profileId,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}
