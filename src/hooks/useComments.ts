import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { JazzReaction } from '@/types';
import { PostWithAuthor } from './usePosts';

export interface CommentWithAuthor {
  id: string;
  content: string;
  created_at: string;
  post_id: string;
  parent_id: string | null;
  author: {
    id: string;
    name: string;
    username: string;
    avatar: string | null;
    is_ai: boolean;
  };
  reactions: Record<JazzReaction, number>;
  userReaction?: JazzReaction;
}

export function usePost(postId: string) {
  return useQuery({
    queryKey: ['post', postId],
    queryFn: async (): Promise<PostWithAuthor | null> => {
      const { data: post, error } = await supabase
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
        .eq('id', postId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching post:', error);
        throw error;
      }

      if (!post) return null;

      // Fetch reactions
      const { data: reactions } = await supabase
        .from('post_reactions')
        .select('reaction')
        .eq('post_id', postId);

      // Fetch moderation flags
      const { data: flags } = await supabase
        .from('moderation_flags')
        .select('id')
        .eq('target_type', 'post')
        .eq('target_id', postId)
        .eq('status', 'pending');

      const reactionCounts: Record<JazzReaction, number> = {
        '🎷': 0,
        '🎺': 0,
        '🎹': 0,
        '🥁': 0,
        '🎼': 0,
      };

      reactions?.forEach(r => {
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
        isFlagged: (flags?.length || 0) > 0,
      };
    },
    enabled: !!postId,
  });
}

export function useComments(postId: string) {
  return useQuery({
    queryKey: ['comments', postId],
    queryFn: async (): Promise<CommentWithAuthor[]> => {
      const { data: comments, error } = await supabase
        .from('comments')
        .select(`
          id,
          content,
          created_at,
          post_id,
          parent_id,
          author_id,
          profiles!comments_author_id_fkey (
            id,
            name,
            username,
            avatar,
            is_ai
          )
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching comments:', error);
        throw error;
      }

      if (!comments || comments.length === 0) return [];

      // Fetch reactions for all comments
      const commentIds = comments.map(c => c.id);
      const { data: reactions } = await supabase
        .from('comment_reactions')
        .select('comment_id, reaction')
        .in('comment_id', commentIds);

      return comments.map(comment => {
        const commentReactions = reactions?.filter(r => r.comment_id === comment.id) || [];
        const reactionCounts: Record<JazzReaction, number> = {
          '🎷': 0,
          '🎺': 0,
          '🎹': 0,
          '🥁': 0,
          '🎼': 0,
        };

        commentReactions.forEach(r => {
          if (r.reaction in reactionCounts) {
            reactionCounts[r.reaction as JazzReaction]++;
          }
        });

        return {
          id: comment.id,
          content: comment.content,
          created_at: comment.created_at,
          post_id: comment.post_id,
          parent_id: comment.parent_id,
          author: comment.profiles as any,
          reactions: reactionCounts,
        };
      });
    },
    enabled: !!postId,
  });
}

export function useCreateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      postId,
      content,
      authorId,
      parentId,
    }: {
      postId: string;
      content: string;
      authorId: string;
      parentId?: string;
    }) => {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          post_id: postId,
          content,
          author_id: authorId,
          parent_id: parentId || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Update post comment count
      const { data: post } = await supabase
        .from('posts')
        .select('comment_count')
        .eq('id', postId)
        .single();

      if (post) {
        await supabase
          .from('posts')
          .update({ comment_count: (post.comment_count || 0) + 1 })
          .eq('id', postId);
      }

      // Trigger moderation check
      await supabase.functions.invoke('moderate-content', {
        body: {
          content,
          targetType: 'comment',
          targetId: data.id,
        },
      }).catch(console.error);

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['comments', variables.postId] });
      queryClient.invalidateQueries({ queryKey: ['post', variables.postId] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      toast.success('Comment posted!');
    },
    onError: (error) => {
      console.error('Error creating comment:', error);
      toast.error('Failed to post comment');
    },
  });
}

export function useReactToComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      commentId,
      reaction,
      profileId,
    }: {
      commentId: string;
      reaction: JazzReaction;
      profileId: string;
    }) => {
      // Check if user already reacted
      const { data: existing } = await supabase
        .from('comment_reactions')
        .select('id, reaction')
        .eq('comment_id', commentId)
        .eq('profile_id', profileId)
        .maybeSingle();

      if (existing) {
        if (existing.reaction === reaction) {
          // Remove reaction
          await supabase.from('comment_reactions').delete().eq('id', existing.id);
        } else {
          // Update reaction
          await supabase.from('comment_reactions').update({ reaction }).eq('id', existing.id);
        }
      } else {
        // Add new reaction
        await supabase.from('comment_reactions').insert({
          comment_id: commentId,
          profile_id: profileId,
          reaction,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments'] });
    },
    onError: (error) => {
      console.error('Error reacting to comment:', error);
      toast.error('Sign in to react to comments');
    },
  });
}
