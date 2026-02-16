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
        .order('event_date', { ascending: false });

      if (error) throw error;
      return data.map((post: any) => ({
        ...post,
        author: post.profiles,
      }));
    },
  });
}

export function useMyPromoPosts(authorId: string | undefined) {
  return useQuery({
    queryKey: ['my-promo-posts', authorId],
    queryFn: async () => {
      if (!authorId) return [];
      const { data, error } = await supabase
        .from('promo_posts')
        .select(`*, profiles!promo_posts_author_id_fkey (*)`)
        .eq('author_id', authorId)
        .order('event_date', { ascending: false });

      if (error) throw error;
      return data.map((post: any) => ({
        ...post,
        author: post.profiles,
      }));
    },
    enabled: !!authorId,
  });
}

export function useFriendsPromoPosts() {
  return useQuery({
    queryKey: ['friends-promo-posts'],
    queryFn: async () => {
      // First get the current user's profile ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!currentProfile) return [];

      // Get friend IDs from accepted friendships
      const { data: friendships, error: friendshipsError } = await supabase
        .from('friendships')
        .select('requester_id, addressee_id')
        .eq('status', 'accepted')
        .or(`requester_id.eq.${currentProfile.id},addressee_id.eq.${currentProfile.id}`);

      if (friendshipsError) throw friendshipsError;

      const friendIds = friendships.map(f => 
        f.requester_id === currentProfile.id ? f.addressee_id : f.requester_id
      );

      if (friendIds.length === 0) return [];

      // Get promo posts from friends only
      const { data, error } = await supabase
        .from('promo_posts')
        .select(`*, profiles!promo_posts_author_id_fkey (*)`)
        .in('author_id', friendIds)
        .order('event_date', { ascending: false });

      if (error) throw error;
      return data.map((post: any) => ({
        ...post,
        author: post.profiles,
      }));
    },
  });
}

export function usePaidGigs() {
  return useQuery({
    queryKey: ['paid-gigs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('promo_posts')
        .select(`*, profiles!promo_posts_author_id_fkey (*)`)
        .eq('is_paid_opportunity', true)
        .order('event_date', { ascending: false });

      if (error) throw error;
      return data.map((post: any) => ({
        ...post,
        author: post.profiles,
      }));
    },
  });
}

export function useFeedGigs() {
  return useQuery({
    queryKey: ['feed-gigs'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!currentProfile) return [];

      const { data, error } = await supabase
        .from('promo_posts')
        .select(`*, profiles!promo_posts_author_id_fkey (*)`)
        .eq('author_id', currentProfile.id)
        .eq('show_on_feed', true)
        .order('event_date', { ascending: false });

      if (error) throw error;
      return data.map((post: any) => ({
        ...post,
        author: post.profiles,
      }));
    },
  });
}

export function useFriendsFeedGigs() {
  return useQuery({
    queryKey: ['friends-feed-gigs'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!currentProfile) return [];

      // Get friend IDs from accepted friendships
      const { data: friendships, error: friendshipsError } = await supabase
        .from('friendships')
        .select('requester_id, addressee_id')
        .eq('status', 'accepted')
        .or(`requester_id.eq.${currentProfile.id},addressee_id.eq.${currentProfile.id}`);

      if (friendshipsError) throw friendshipsError;

      const friendIds = friendships.map(f => 
        f.requester_id === currentProfile.id ? f.addressee_id : f.requester_id
      );

      if (friendIds.length === 0) return [];

      // Get gigs from friends with show_on_feed enabled
      const { data, error } = await supabase
        .from('promo_posts')
        .select(`*, profiles!promo_posts_author_id_fkey (*)`)
        .in('author_id', friendIds)
        .eq('show_on_feed', true)
        .order('created_at', { ascending: false });

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
      showOnFeed = false,
      isPaidOpportunity = false,
      collaboratorIds = [],
    }: {
      authorId: string;
      promoType: 'gig';
      title: string;
      description?: string;
      eventDate?: string;
      image?: string;
      links?: string[];
      showOnFeed?: boolean;
      isPaidOpportunity?: boolean;
      collaboratorIds?: string[];
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
          show_on_feed: showOnFeed,
          is_paid_opportunity: isPaidOpportunity,
          collaborator_ids: collaboratorIds,
        })
        .select()
        .single();

      if (error) throw error;
      return data as PromoPost;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promo-posts'] });
      queryClient.invalidateQueries({ queryKey: ['my-promo-posts'] });
      queryClient.invalidateQueries({ queryKey: ['friends-promo-posts'] });
      queryClient.invalidateQueries({ queryKey: ['paid-gigs'] });
      queryClient.invalidateQueries({ queryKey: ['feed-gigs'] });
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
      queryClient.invalidateQueries({ queryKey: ['my-promo-posts'] });
      queryClient.invalidateQueries({ queryKey: ['friends-promo-posts'] });
      queryClient.invalidateQueries({ queryKey: ['paid-gigs'] });
      queryClient.invalidateQueries({ queryKey: ['gig'] });
      toast.success('Post deleted');
    },
    onError: (error) => {
      console.error('Error deleting promo post:', error);
      toast.error('Failed to delete post');
    },
  });
}

export function useUpdatePromoPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      postId,
      title,
      description,
      eventDate,
      image,
      links,
      showOnFeed,
      isPaidOpportunity,
      collaboratorIds,
      repostReminderDays,
    }: {
      postId: string;
      title?: string;
      description?: string;
      eventDate?: string | null;
      image?: string | null;
      links?: string[];
      showOnFeed?: boolean;
      isPaidOpportunity?: boolean;
      collaboratorIds?: string[];
      repostReminderDays?: number | null;
    }) => {
      const updates: Record<string, any> = {};
      if (title !== undefined) updates.title = title;
      if (description !== undefined) updates.description = description;
      if (eventDate !== undefined) updates.event_date = eventDate;
      if (image !== undefined) updates.image = image;
      if (links !== undefined) updates.links = links;
      if (showOnFeed !== undefined) updates.show_on_feed = showOnFeed;
      if (isPaidOpportunity !== undefined) updates.is_paid_opportunity = isPaidOpportunity;
      if (collaboratorIds !== undefined) updates.collaborator_ids = collaboratorIds;
      if (repostReminderDays !== undefined) updates.repost_reminder_days = repostReminderDays;

      const { data, error } = await supabase
        .from('promo_posts')
        .update(updates)
        .eq('id', postId)
        .select()
        .single();

      if (error) throw error;
      return data as PromoPost;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['promo-posts'] });
      queryClient.invalidateQueries({ queryKey: ['my-promo-posts'] });
      queryClient.invalidateQueries({ queryKey: ['friends-promo-posts'] });
      queryClient.invalidateQueries({ queryKey: ['paid-gigs'] });
      queryClient.invalidateQueries({ queryKey: ['feed-gigs'] });
      queryClient.invalidateQueries({ queryKey: ['gig'] });
      toast.success('Gig updated!');
    },
    onError: (error) => {
      console.error('Error updating promo post:', error);
      toast.error('Failed to update gig');
    },
  });
}
