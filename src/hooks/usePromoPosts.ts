import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PromoPost } from '@/types';

export function usePromoPosts() {
  return useQuery({
    queryKey: ['promo-posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('promo_posts')
        .select(`*, profiles!promo_posts_author_id_fkey (*)`)
        .order('event_date', { ascending: true });

      if (error) throw error;
      return data.map((post: any) => ({
        ...post,
        author: post.profiles,
      }));
    },
  });
}

export function useCreatePromoPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      authorId,
      promoType,
      title,
      description,
      eventDate,
      image,
      links = [],
    }: {
      authorId: string;
      promoType: 'gig' | 'release' | 'event';
      title: string;
      description?: string;
      eventDate?: string;
      image?: string;
      links?: string[];
    }) => {
      const { data, error } = await supabase
        .from('promo_posts')
        .insert({
          author_id: authorId,
          promo_type: promoType,
          title,
          description,
          event_date: eventDate,
          image,
          links,
        })
        .select()
        .single();

      if (error) throw error;
      return data as PromoPost;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promo-posts'] });
      toast.success('Posted!');
    },
    onError: (error) => {
      console.error('Error creating promo post:', error);
      toast.error('Failed to create post');
    },
  });
}

export function useDeletePromoPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase
        .from('promo_posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promo-posts'] });
      toast.success('Post deleted');
    },
    onError: (error) => {
      console.error('Error deleting promo post:', error);
      toast.error('Failed to delete post');
    },
  });
}
