import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

/**
 * Shared hook that fetches accepted friend IDs (excluding muted friends) once.
 * All friends-feed hooks should consume this instead of re-fetching friendships.
 * Uses profile.id (not user.id) because friendships reference profile IDs.
 */
export function useFriendIds() {
  const { profile } = useAuth();
  const profileId = profile?.id;

  return useQuery({
    queryKey: ['friend-ids', profileId],
    queryFn: async (): Promise<string[]> => {
      if (!profileId) return [];

      // Fetch friendships and muted friends in parallel
      // friendships.requester_id / addressee_id reference profiles.id
      const [friendshipsResult, mutedResult] = await Promise.all([
        supabase
          .from('friendships')
          .select('requester_id, addressee_id')
          .eq('status', 'accepted')
          .or(`requester_id.eq.${profileId},addressee_id.eq.${profileId}`),
        supabase
          .from('muted_friends')
          .select('muted_friend_id')
          .eq('user_id', profileId),
      ]);

      if (friendshipsResult.error) throw friendshipsResult.error;

      const mutedIds = new Set((mutedResult.data || []).map(m => m.muted_friend_id));

      return friendshipsResult.data
        .map(f => f.requester_id === profileId ? f.addressee_id : f.requester_id)
        .filter(id => !mutedIds.has(id));
    },
    enabled: !!profileId,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    placeholderData: undefined,
  });
}
