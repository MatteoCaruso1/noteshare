import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { JazzReaction } from '@/types';

export interface PostWithAuthor {
  id: string;
  content: string;
  post_type: string;
  tags: string[];
  comment_count: number;
  created_at: string;
  updated_at: string;
  media: any;
  author_id: string;
  author: {
    id: string;
    name: string;
    username: string;
    avatar: string | null;
    is_ai: boolean;
  };
  reactions: Record<JazzReaction, number>;
  userReaction?: JazzReaction;
  isFlagged?: boolean;
}

export function usePosts(selectedTags: string[] = []) {
  return useQuery({
    queryKey: ['posts', selectedTags],
    queryFn: async (): Promise<PostWithAuthor[]> => {
      let query = supabase
        .from('posts')
        .select(`
          id,
          content,
          post_type,
          tags,
          comment_count,
          created_at,
          updated_at,
          media,
          author_id,
          profiles!posts_author_id_fkey (
            id,
            name,
            username,
            avatar,
            is_ai
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      const { data: posts, error } = await query;

      if (error) {
        console.error('Error fetching posts:', error);
        throw error;
      }

      // Fetch reactions for all posts
      const postIds = posts?.map(p => p.id) || [];
      const { data: reactions } = await supabase
        .from('post_reactions')
        .select('post_id, reaction')
        .in('post_id', postIds);

      // Fetch moderation flags
      const { data: flags } = await supabase
        .from('moderation_flags')
        .select('target_id')
        .eq('target_type', 'post')
        .eq('status', 'pending')
        .in('target_id', postIds);

      const flaggedPostIds = new Set(flags?.map(f => f.target_id) || []);

      // Transform posts
      const transformedPosts = (posts || []).map(post => {
        const postReactions = reactions?.filter(r => r.post_id === post.id) || [];
        const reactionCounts: Record<JazzReaction, number> = {
          '🎷': 0,
          '🎺': 0,
          '🎹': 0,
          '🥁': 0,
          '🎼': 0,
        };
        
        postReactions.forEach(r => {
          if (r.reaction in reactionCounts) {
            reactionCounts[r.reaction as JazzReaction]++;
          }
        });

        return {
          id: post.id,
          content: post.content,
          post_type: post.post_type,
          tags: post.tags,
          comment_count: post.comment_count,
          created_at: post.created_at,
          updated_at: post.updated_at,
          media: post.media,
          author_id: post.author_id,
          author: post.profiles as any,
          reactions: reactionCounts,
          isFlagged: flaggedPostIds.has(post.id),
        };
      });

      // Filter by tags if any selected
      if (selectedTags.length > 0) {
        return transformedPosts.filter(post => 
          post.tags.some(tag => selectedTags.includes(tag))
        );
      }

      return transformedPosts;
    },
    staleTime: 30000,
  });
}

export function useReactToPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, reaction, profileId }: { 
      postId: string; 
      reaction: JazzReaction;
      profileId: string;
    }) => {
      // Check if user already reacted
      const { data: existing } = await supabase
        .from('post_reactions')
        .select('id, reaction')
        .eq('post_id', postId)
        .eq('profile_id', profileId)
        .maybeSingle();

      if (existing) {
        if (existing.reaction === reaction) {
          // Remove reaction
          await supabase.from('post_reactions').delete().eq('id', existing.id);
        } else {
          // Update reaction
          await supabase.from('post_reactions').update({ reaction }).eq('id', existing.id);
        }
      } else {
        // Add new reaction
        await supabase.from('post_reactions').insert({
          post_id: postId,
          profile_id: profileId,
          reaction,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
    onError: (error) => {
      console.error('Error reacting to post:', error);
      toast.error('Sign in to react to posts');
    },
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      content, 
      postType, 
      tags, 
      authorId 
    }: { 
      content: string; 
      postType: string;
      tags: string[];
      authorId: string;
    }) => {
      const { data, error } = await supabase
        .from('posts')
        .insert({
          content,
          post_type: postType as any,
          tags,
          author_id: authorId,
        })
        .select()
        .single();

      if (error) throw error;

      // Trigger moderation check
      await supabase.functions.invoke('moderate-content', {
        body: {
          content,
          targetType: 'post',
          targetId: data.id,
        },
      }).catch(console.error);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      toast.success('Post created!');
    },
    onError: (error) => {
      console.error('Error creating post:', error);
      toast.error('Failed to create post');
    },
  });
}
