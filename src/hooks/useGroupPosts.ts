import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface GroupPost {
  id: string;
  group_id: string;
  author_id: string;
  text_content: string | null;
  audio_files: string[];
  audio_file_names: string[];
  created_at: string;
  updated_at: string;
  author?: {
    id: string;
    name: string;
    avatar: string | null;
  };
}

export interface CreateGroupPostData {
  groupId: string;
  textContent?: string;
  audioFiles?: string[];
  audioFileNames?: string[];
}

// Fetch posts for a group
export function useGroupPosts(groupId: string | undefined) {
  return useQuery({
    queryKey: ['group-posts', groupId],
    queryFn: async () => {
      if (!groupId) return [];
      
      const { data, error } = await supabase
        .from('group_posts')
        .select(`
          *,
          author:profiles!group_posts_author_id_fkey (
            id,
            name,
            avatar
          )
        `)
        .eq('group_id', groupId)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data as GroupPost[];
    },
    enabled: !!groupId,
  });
}

// Create a new group post
export function useCreateGroupPost() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  
  return useMutation({
    mutationFn: async (data: CreateGroupPostData) => {
      if (!profile?.id) throw new Error('Not authenticated');
      
      const { data: post, error } = await supabase
        .from('group_posts')
        .insert({
          group_id: data.groupId,
          author_id: profile.id,
          text_content: data.textContent || null,
          audio_files: data.audioFiles || [],
          audio_file_names: data.audioFileNames || [],
        })
        .select(`
          *,
          author:profiles!group_posts_author_id_fkey (
            id,
            name,
            avatar
          )
        `)
        .single();
      
      if (error) throw error;
      return post as GroupPost;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['group-posts', variables.groupId] });
      toast.success('Posted!');
    },
    onError: (error) => {
      console.error('Failed to create group post:', error);
      toast.error('Failed to post');
    },
  });
}

// Delete a group post
export function useDeleteGroupPost() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ postId, groupId }: { postId: string; groupId: string }) => {
      const { error } = await supabase
        .from('group_posts')
        .delete()
        .eq('id', postId);
      
      if (error) throw error;
      return { postId, groupId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['group-posts', data.groupId] });
      toast.success('Post deleted');
    },
    onError: (error) => {
      console.error('Failed to delete group post:', error);
      toast.error('Failed to delete post');
    },
  });
}
