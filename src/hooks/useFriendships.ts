import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from './useAuth';
import { useFriendIds } from './useFriendIds';
import { Profile, FriendshipWithProfile, NoteWithAuthor } from '@/types';

export function useFriendships() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['friendships', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];

      // Run both queries in parallel
      const [friendshipsResult, profilesResult] = await Promise.all([
        supabase
          .from('friendships')
          .select('*')
          .or(`requester_id.eq.${profile.id},addressee_id.eq.${profile.id}`),
        supabase
          .from('profiles')
          .select('id, name, username, avatar, instruments, genres, open_to_collaborate, current_streak')
      ]);

      if (friendshipsResult.error) throw friendshipsResult.error;

      const data = friendshipsResult.data;
      const profileMap = new Map((profilesResult.data || []).map(p => [p.id, p]));

      return data.map(f => ({
        ...f,
        status: f.status as 'pending' | 'accepted' | 'rejected',
        requester: profileMap.get(f.requester_id) as Profile,
        addressee: profileMap.get(f.addressee_id) as Profile,
      })) as FriendshipWithProfile[];
    },
    enabled: !!profile?.id,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function usePendingFriendRequests() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['pending-friend-requests', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];

      // Use a join to fetch friendships with requester profiles in a single query
      const { data, error } = await supabase
        .from('friendships')
        .select(`
          *,
          profiles!friendships_requester_id_fkey (
            id, name, username, avatar, instruments, genres, open_to_collaborate, current_streak
          )
        `)
        .eq('addressee_id', profile.id)
        .eq('status', 'pending');

      if (error) throw error;

      return (data || []).map((f: any) => ({
        ...f,
        status: f.status as 'pending' | 'accepted' | 'rejected',
        requester: f.profiles as Profile,
      })) as FriendshipWithProfile[];
    },
    enabled: !!profile?.id,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useFriends() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['friends', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];

      // Get friendships first
      const { data: friendships, error: friendshipsError } = await supabase
        .from('friendships')
        .select('requester_id, addressee_id')
        .eq('status', 'accepted')
        .or(`requester_id.eq.${profile.id},addressee_id.eq.${profile.id}`);

      if (friendshipsError) throw friendshipsError;

      // Get friend IDs (the other person)
      const friendIds = friendships.map(f => 
        f.requester_id === profile.id ? f.addressee_id : f.requester_id
      );

      if (friendIds.length === 0) return [];

      // Only fetch profiles for actual friends (not all profiles)
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, name, username, avatar, instruments, genres, open_to_collaborate, current_streak')
        .in('id', friendIds);

      if (profilesError) throw profilesError;

      return profiles as Profile[];
    },
    enabled: !!profile?.id,
    staleTime: 2 * 60 * 1000, // Consider data fresh for 2 minutes
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
  });
}

export function useSendFriendRequest() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (addresseeId: string) => {
      if (!profile?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('friendships')
        .insert({
          requester_id: profile.id,
          addressee_id: addresseeId,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendships'] });
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      toast.success('Friend request sent!');
    },
    onError: (error: Error) => {
      console.error('Error sending friend request:', error);
      if (error.message.includes('duplicate')) {
        toast.error('Friend request already sent');
      } else {
        toast.error('Failed to send friend request');
      }
    },
  });
}

export function useRespondToFriendRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ friendshipId, status }: { friendshipId: string; status: 'accepted' | 'rejected' }) => {
      const { data, error } = await supabase
        .from('friendships')
        .update({ status })
        .eq('id', friendshipId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['friendships'] });
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['pending-friend-requests'] });
      queryClient.invalidateQueries({ queryKey: ['friends-notes'] });
      toast.success(status === 'accepted' ? 'Friend request accepted!' : 'Friend request declined');
    },
    onError: (error) => {
      console.error('Error responding to friend request:', error);
      toast.error('Failed to respond to friend request');
    },
  });
}

export function useRemoveFriend() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (friendId: string) => {
      if (!profile?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('friendships')
        .delete()
        .or(`and(requester_id.eq.${profile.id},addressee_id.eq.${friendId}),and(requester_id.eq.${friendId},addressee_id.eq.${profile.id})`);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendships'] });
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['friends-notes'] });
      toast.success('Friend removed');
    },
    onError: (error) => {
      console.error('Error removing friend:', error);
      toast.error('Failed to remove friend');
    },
  });
}

export function useFriendshipStatus(targetProfileId: string | undefined) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['friendship-status', profile?.id, targetProfileId],
    queryFn: async () => {
      if (!profile?.id || !targetProfileId) return null;

      const { data, error } = await supabase
        .from('friendships')
        .select('*')
        .or(`and(requester_id.eq.${profile.id},addressee_id.eq.${targetProfileId}),and(requester_id.eq.${targetProfileId},addressee_id.eq.${profile.id})`)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id && !!targetProfileId,
  });
}

export function useSearchUsers(query: string) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['search-users', query],
    queryFn: async () => {
      if (!query.trim()) return [];

      const searchTerm = query.toLowerCase().replace('@', '');
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`name.ilike.%${searchTerm}%,username.ilike.%${searchTerm}%`)
        .neq('id', profile?.id || '')
        .limit(20);

      if (error) throw error;
      return data as Profile[];
    },
    enabled: query.length >= 2,
  });
}

export function useFriendsNotes() {
  const { profile } = useAuth();
  const { data: friendIds } = useFriendIds();

  return useQuery({
    queryKey: ['friends-notes', profile?.id],
    queryFn: async () => {
      if (!friendIds || friendIds.length === 0) return [];

      const { data: notes, error: notesError } = await supabase
        .from('notes')
        .select(`
          *,
          profiles!notes_author_id_fkey (
            id, name, username, avatar, current_streak
          ),
          practice_sessions!notes_session_id_fkey (
            id, started_at, ended_at, paused_duration_ms
          )
        `)
        .in('author_id', friendIds)
        .eq('visibility', 'friends')
        .order('created_at', { ascending: false })
        .limit(50);

      if (notesError) throw notesError;

      return notes.map((note: any) => ({
        ...note,
        visibility: note.visibility as NoteWithAuthor['visibility'],
        author: note.profiles,
        session: note.practice_sessions,
      })) as NoteWithAuthor[];
    },
    enabled: !!profile?.id && !!friendIds && friendIds.length > 0,
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  });
}

// Get suggested musicians (friends-of-friends who are not already friends)
export type SuggestionReason = 'mutual' | 'genre' | 'collaborate';

export type SuggestedProfile = Profile & {
  mutualCount: number;
  reasons: SuggestionReason[];
  matchingGenres: string[];
};

// Default recommended profile ID (Matteo) - always shown as a suggestion
const DEFAULT_RECOMMENDED_PROFILE_ID = '9d8991fb-b065-415c-90f1-96b418ae23a2';

export function useSuggestedMusicians() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['suggested-musicians', profile?.id],
    queryFn: async (): Promise<SuggestedProfile[]> => {
      if (!profile?.id) return [];

      const myGenres = profile.genres || [];
      const excludeIds = new Set<string>([profile.id]);
      const suggestionMap = new Map<string, { mutualCount: number; reasons: Set<SuggestionReason>; matchingGenres: string[] }>();

      // Run initial queries in parallel: all friendships (accepted + pending) and potential suggestions
      const [friendshipsResult, collaboratorsResult, genreMatchesResult] = await Promise.all([
        // Get all friendships in one query
        supabase
          .from('friendships')
          .select('requester_id, addressee_id, status')
          .or(`requester_id.eq.${profile.id},addressee_id.eq.${profile.id}`),
        // Get users open to collaborate
        supabase
          .from('profiles')
          .select('id, genres')
          .eq('open_to_collaborate', true)
          .neq('id', profile.id)
          .limit(50),
        // Get users with matching genres
        myGenres.length > 0
          ? supabase
              .from('profiles')
              .select('id, genres')
              .neq('id', profile.id)
              .overlaps('genres', myGenres)
              .limit(50)
          : Promise.resolve({ data: [], error: null })
      ]);

      if (friendshipsResult.error) throw friendshipsResult.error;
      if (collaboratorsResult.error) throw collaboratorsResult.error;
      if (genreMatchesResult.error) throw genreMatchesResult.error;

      const allFriendships = friendshipsResult.data || [];
      
      // Separate accepted and pending friendships
      const myAcceptedFriendIds: string[] = [];
      allFriendships.forEach(f => {
        const otherId = f.requester_id === profile.id ? f.addressee_id : f.requester_id;
        if (f.status === 'accepted') {
          myAcceptedFriendIds.push(otherId);
          excludeIds.add(otherId);
        } else if (f.status === 'pending') {
          excludeIds.add(f.requester_id);
          excludeIds.add(f.addressee_id);
        }
      });

      // Get friends-of-friends only if we have friends
      if (myAcceptedFriendIds.length > 0) {
        const { data: fofFriendships, error: fofError } = await supabase
          .from('friendships')
          .select('requester_id, addressee_id')
          .eq('status', 'accepted')
          .or(myAcceptedFriendIds.map(id => `requester_id.eq.${id},addressee_id.eq.${id}`).join(','));

        if (fofError) throw fofError;

        (fofFriendships || []).forEach(f => {
          const otherId = myAcceptedFriendIds.includes(f.requester_id) ? f.addressee_id : f.requester_id;
          if (!excludeIds.has(otherId)) {
            const existing = suggestionMap.get(otherId) || { mutualCount: 0, reasons: new Set(), matchingGenres: [] };
            existing.mutualCount += 1;
            existing.reasons.add('mutual');
            suggestionMap.set(otherId, existing);
          }
        });
      }

      // Process collaborators
      (collaboratorsResult.data || []).forEach(user => {
        if (!excludeIds.has(user.id)) {
          const existing = suggestionMap.get(user.id) || { mutualCount: 0, reasons: new Set(), matchingGenres: [] };
          existing.reasons.add('collaborate');
          
          const userGenres = user.genres || [];
          const overlap = myGenres.filter(g => userGenres.includes(g));
          if (overlap.length > 0) {
            existing.reasons.add('genre');
            existing.matchingGenres = overlap;
          }
          
          suggestionMap.set(user.id, existing);
        }
      });

      // Process genre matches
      (genreMatchesResult.data || []).forEach(user => {
        if (!excludeIds.has(user.id)) {
          const existing = suggestionMap.get(user.id) || { mutualCount: 0, reasons: new Set(), matchingGenres: [] };
          const userGenres = user.genres || [];
          const overlap = myGenres.filter(g => userGenres.includes(g));
          if (overlap.length > 0) {
            existing.reasons.add('genre');
            existing.matchingGenres = overlap;
          }
          suggestionMap.set(user.id, existing);
        }
      });

      // Always add the default recommended profile (Matteo) if not excluded
      if (!excludeIds.has(DEFAULT_RECOMMENDED_PROFILE_ID)) {
        const existing = suggestionMap.get(DEFAULT_RECOMMENDED_PROFILE_ID) || { mutualCount: 0, reasons: new Set(), matchingGenres: [] };
        // Add a special marker - will show as "collaborate" badge
        existing.reasons.add('collaborate');
        suggestionMap.set(DEFAULT_RECOMMENDED_PROFILE_ID, existing);
      }

      // Fetch full profiles for suggestions
      const suggestionIds = Array.from(suggestionMap.keys());
      if (suggestionIds.length === 0) return [];

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', suggestionIds)
        .limit(15);

      if (profilesError) throw profilesError;

      return (profiles || [])
        .map(p => {
          const meta = suggestionMap.get(p.id) || { mutualCount: 0, reasons: new Set(), matchingGenres: [] };
          return {
            ...p,
            // Cast JSONB field to proper type
            streak_achievement_counts: (p.streak_achievement_counts || {}) as Record<string, number>,
            mutualCount: meta.mutualCount,
            reasons: Array.from(meta.reasons) as SuggestionReason[],
            matchingGenres: meta.matchingGenres,
          };
        })
        .sort((a, b) => {
          // Prioritize the default recommended profile to always appear first
          if (a.id === DEFAULT_RECOMMENDED_PROFILE_ID) return -1;
          if (b.id === DEFAULT_RECOMMENDED_PROFILE_ID) return 1;
          
          const scoreA = a.mutualCount * 3 + (a.reasons.includes('collaborate') ? 2 : 0) + (a.reasons.includes('genre') ? 1 : 0);
          const scoreB = b.mutualCount * 3 + (b.reasons.includes('collaborate') ? 2 : 0) + (b.reasons.includes('genre') ? 1 : 0);
          return scoreB - scoreA;
        });
    },
    enabled: !!profile?.id,
    staleTime: 5 * 60 * 1000, // Suggestions are expensive, cache for 5 minutes
    gcTime: 10 * 60 * 1000,
  });
}

// Hook to get muted friends list
export function useMutedFriends() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['muted-friends', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('muted_friends')
        .select('muted_friend_id')
        .eq('user_id', user.id);

      if (error) throw error;
      return (data || []).map(m => m.muted_friend_id);
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
  });
}

// Hook to check if a specific friend is muted
export function useIsFriendMuted(friendId: string | undefined) {
  const { data: mutedFriends } = useMutedFriends();
  return mutedFriends?.includes(friendId || '') || false;
}

// Hook to mute a friend
export function useMuteFriend() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (friendId: string) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('muted_friends')
        .insert({ user_id: user.id, muted_friend_id: friendId });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['muted-friends'] });
      queryClient.invalidateQueries({ queryKey: ['friends-notes'] });
      toast.success('Friend muted');
    },
    onError: (error) => {
      console.error('Error muting friend:', error);
      toast.error('Failed to mute friend');
    },
  });
}

// Hook to unmute a friend
export function useUnmuteFriend() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (friendId: string) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('muted_friends')
        .delete()
        .eq('user_id', user.id)
        .eq('muted_friend_id', friendId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['muted-friends'] });
      queryClient.invalidateQueries({ queryKey: ['friends-notes'] });
      toast.success('Friend unmuted');
    },
    onError: (error) => {
      console.error('Error unmuting friend:', error);
      toast.error('Failed to unmute friend');
    },
  });
}
