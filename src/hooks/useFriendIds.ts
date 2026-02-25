import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

/**
 * Shared hook that fetches accepted friend IDs (excluding muted friends) once.
 * All friends-feed hooks should consume this instead of re-fetching friendships.
 */
export function useFriendIds() {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: ['friend-ids', userId],
    queryFn: async (): Promise<string[]> => {
      if (!userId) return [];

      // Fetch friendships and muted friends in parallel
      // profile.id === user.id (set in handle_new_user trigger)
      const [friendshipsResult, mutedResult] = await Promise.all([
        supabase
          .from('friendships')
          .select('requester_id, addressee_id')
          .eq('status', 'accepted')
          .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`),
        supabase
          .from('muted_friends')
          .select('muted_friend_id')
          .eq('user_id', userId),
      ]);

      if (friendshipsResult.error) throw friendshipsResult.error;

      const mutedIds = new Set((mutedResult.data || []).map(m => m.muted_friend_id));

      return friendshipsResult.data
        .map(f => f.requester_id === userId ? f.addressee_id : f.requester_id)
        .filter(id => !mutedIds.has(id));
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  });
}
