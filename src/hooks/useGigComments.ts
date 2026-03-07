import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GigCommentWithAuthor {
  id: string;
  gig_id: string;
  author_id: string;
  content: string;
  created_at: string;
  author: {
    id: string;
    name: string;
    username: string;
    avatar: string | null;
  };
}

export function useGigComments(gigId: string | undefined) {
  return useQuery({
    queryKey: ['gig-comments', gigId],
    queryFn: async () => {
      if (!gigId) return [];
      const { data, error } = await supabase
        .from('gig_comments' as any)
        .select('*, profiles!gig_comments_author_id_fkey (id, name, username, avatar)')
        .eq('gig_id', gigId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data as any[]).map((c) => ({
        ...c,
        author: c.profiles,
      })) as GigCommentWithAuthor[];
    },
    enabled: !!gigId,
    staleTime: 30 * 1000,
  });
}

export function useCreateGigComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      gigId,
      authorId,
      content,
      gigOwnerId,
    }: {
      gigId: string;
      authorId: string;
      content: string;
      gigOwnerId: string;
    }) => {
      const { data, error } = await supabase
        .from('gig_comments' as any)
        .insert({ gig_id: gigId, author_id: authorId, content })
        .select()
        .single();

      if (error) throw error;

      // Notify gig owner (if not self-commenting)
      if (gigOwnerId && gigOwnerId !== authorId) {
        const truncated = content.length > 50 ? content.substring(0, 50) + '...' : content;
        await supabase.from('notifications').insert({
          user_id: gigOwnerId,
          type: 'gig_comment',
          content: `commented on your gig: "${truncated}"`,
          gig_id: gigId,
          from_user_id: authorId,
        });
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['gig-comments', variables.gigId] });
      queryClient.invalidateQueries({ queryKey: ['gig', variables.gigId] });
      toast.success('Comment added');
    },
    onError: (error) => {
      console.error('Error creating gig comment:', error);
      toast.error('Failed to add comment');
    },
  });
}

export function useDeleteGigComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ commentId, gigId }: { commentId: string; gigId: string }) => {
      const { error } = await supabase
        .from('gig_comments' as any)
        .delete()
        .eq('id', commentId);

      if (error) throw error;
      return { gigId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['gig-comments', data.gigId] });
      queryClient.invalidateQueries({ queryKey: ['gig', data.gigId] });
      toast.success('Comment deleted');
    },
    onError: (error) => {
      console.error('Error deleting gig comment:', error);
      toast.error('Failed to delete comment');
    },
  });
}
