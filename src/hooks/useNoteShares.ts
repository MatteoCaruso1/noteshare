import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from './useAuth';
import { NoteWithAuthor } from '@/types';

export interface NoteShare {
  id: string;
  note_id: string;
  shared_by_id: string;
  shared_with_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  responded_at: string | null;
}

export interface PendingNoteShare extends NoteShare {
  note: NoteWithAuthor;
  shared_by: {
    id: string;
    name: string;
    username: string;
    avatar: string | null;
  };
}

// Get pending shares for the current user
export function usePendingNoteShares() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['pending-note-shares', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];

      const { data, error } = await supabase
        .from('note_shares')
        .select(`
          *,
          notes!note_shares_note_id_fkey (
            *,
            profiles!notes_author_id_fkey (id, name, username, avatar, current_streak),
            practice_sessions!notes_session_id_fkey (id, started_at, ended_at, paused_duration_ms)
          ),
          shared_by:profiles!note_shares_shared_by_id_fkey (id, name, username, avatar)
        `)
        .eq('shared_with_id', profile.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((share: any) => ({
        ...share,
        note: {
          ...share.notes,
          author: share.notes?.profiles,
          session: share.notes?.practice_sessions,
        },
        shared_by: share.shared_by,
      })) as PendingNoteShare[];
    },
    enabled: !!profile?.id,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

// Get accepted shares (notes shared with the current user that they accepted)
export function useAcceptedNoteShares() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['accepted-note-shares', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];

      const { data, error } = await supabase
        .from('note_shares')
        .select(`
          *,
          notes!note_shares_note_id_fkey (
            *,
            profiles!notes_author_id_fkey (id, name, username, avatar, current_streak),
            practice_sessions!notes_session_id_fkey (id, started_at, ended_at, paused_duration_ms)
          )
        `)
        .eq('shared_with_id', profile.id)
        .eq('status', 'accepted')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((share: any) => ({
        ...share.notes,
        author: share.notes?.profiles,
        session: share.notes?.practice_sessions,
        _share_id: share.id, // Keep track of the share for potential removal
      })) as NoteWithAuthor[];
    },
    enabled: !!profile?.id,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

// Create note shares for multiple friends
export function useCreateNoteShares() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({
      noteId,
      sharedWithIds,
    }: {
      noteId: string;
      sharedWithIds: string[];
    }) => {
      if (!profile?.id) throw new Error('Not authenticated');
      if (sharedWithIds.length === 0) return [];

      const shares = sharedWithIds.map((friendId) => ({
        note_id: noteId,
        shared_by_id: profile.id,
        shared_with_id: friendId,
      }));

      const { data, error } = await supabase
        .from('note_shares')
        .insert(shares)
        .select();

      if (error) throw error;

      // Create notifications for each friend
      const notifications = sharedWithIds.map((friendId) => ({
        user_id: friendId,
        type: 'session_share',
        content: 'wants to share a practice session with you',
        note_id: noteId,
        from_user_id: profile.id,
      }));

      const { error: notifError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (notifError) {
        console.error('Error creating notifications:', notifError);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-note-shares'] });
    },
    onError: (error) => {
      console.error('Error creating note shares:', error);
      toast.error('Failed to share with friends');
    },
  });
}

// Respond to a note share (accept or reject)
export function useRespondToNoteShare() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      shareId,
      status,
    }: {
      shareId: string;
      status: 'accepted' | 'rejected';
    }) => {
      const { data, error } = await supabase
        .from('note_shares')
        .update({
          status,
          responded_at: new Date().toISOString(),
        })
        .eq('id', shareId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['pending-note-shares'] });
      queryClient.invalidateQueries({ queryKey: ['accepted-note-shares'] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      toast.success(
        status === 'accepted'
          ? 'Session added to your timeline!'
          : 'Share declined'
      );
    },
    onError: (error) => {
      console.error('Error responding to share:', error);
      toast.error('Failed to respond');
    },
  });
}

// Count pending shares (for notification badge)
export function usePendingNoteShareCount() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['pending-note-share-count', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return 0;

      const { count, error } = await supabase
        .from('note_shares')
        .select('*', { count: 'exact', head: true })
        .eq('shared_with_id', profile.id)
        .eq('status', 'pending');

      if (error) throw error;
      return count || 0;
    },
    enabled: !!profile?.id,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}
