import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from './useAuth';
import { Profile, FriendshipWithProfile, NoteWithAuthor } from '@/types';

export function useFriendships() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['friendships', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];

      const { data, error } = await supabase
        .from('friendships')
        .select('*')
        .or(`requester_id.eq.${profile.id},addressee_id.eq.${profile.id}`);

      if (error) throw error;

      // Fetch profiles separately
      const profileIds = new Set<string>();
      data.forEach(f => {
        profileIds.add(f.requester_id);
        profileIds.add(f.addressee_id);
      });

      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', Array.from(profileIds));

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return data.map(f => ({
        ...f,
        status: f.status as 'pending' | 'accepted' | 'rejected',
        requester: profileMap.get(f.requester_id) as Profile,
        addressee: profileMap.get(f.addressee_id) as Profile,
      })) as FriendshipWithProfile[];
    },
    enabled: !!profile?.id,
  });
}

export function usePendingFriendRequests() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['pending-friend-requests', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];

      const { data, error } = await supabase
        .from('friendships')
        .select('*')
        .eq('addressee_id', profile.id)
        .eq('status', 'pending');

      if (error) throw error;

      // Fetch requester profiles
      const requesterIds = data.map(f => f.requester_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', requesterIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return data.map(f => ({
        ...f,
        status: f.status as 'pending' | 'accepted' | 'rejected',
        requester: profileMap.get(f.requester_id) as Profile,
      })) as FriendshipWithProfile[];
    },
    enabled: !!profile?.id,
  });
}

export function useFriends() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['friends', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];

      const { data, error } = await supabase
        .from('friendships')
        .select('*')
        .eq('status', 'accepted')
        .or(`requester_id.eq.${profile.id},addressee_id.eq.${profile.id}`);

      if (error) throw error;

      // Get friend IDs (the other person)
      const friendIds = data.map(f => 
        f.requester_id === profile.id ? f.addressee_id : f.requester_id
      );

      if (friendIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', friendIds);

      return (profiles || []) as Profile[];
    },
    enabled: !!profile?.id,
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

  return useQuery({
    queryKey: ['friends-notes', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];

      // First, get all friend IDs
      const { data: friendships, error: friendshipsError } = await supabase
        .from('friendships')
        .select('requester_id, addressee_id')
        .eq('status', 'accepted')
        .or(`requester_id.eq.${profile.id},addressee_id.eq.${profile.id}`);

      if (friendshipsError) throw friendshipsError;

      const friendIds = friendships.map(f => 
        f.requester_id === profile.id ? f.addressee_id : f.requester_id
      );

      if (friendIds.length === 0) return [];

      // Get notes from friends with 'friends' visibility only (no public option)
      const { data: notes, error: notesError } = await supabase
        .from('notes')
        .select('*')
        .in('author_id', friendIds)
        .eq('visibility', 'friends')
        .order('created_at', { ascending: false })
        .limit(50);

      if (notesError) throw notesError;

      // Fetch author profiles
      const authorIds = [...new Set(notes.map(n => n.author_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', authorIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      return notes.map(note => ({
        ...note,
        visibility: note.visibility as NoteWithAuthor['visibility'],
        author: profileMap.get(note.author_id) as Profile,
      })) as NoteWithAuthor[];
    },
    enabled: !!profile?.id,
    staleTime: 30 * 1000, // Consider data fresh for 30 seconds
  });
}

// Get suggested musicians (friends-of-friends who are not already friends)
export type SuggestionReason = 'mutual' | 'genre' | 'collaborate';

export type SuggestedProfile = Profile & {
  mutualCount: number;
  reasons: SuggestionReason[];
  matchingGenres: string[];
};

export function useSuggestedMusicians() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['suggested-musicians', profile?.id],
    queryFn: async (): Promise<SuggestedProfile[]> => {
      if (!profile?.id) return [];

      const myGenres = profile.genres || [];
      const excludeIds = new Set<string>([profile.id]);
      const suggestionMap = new Map<string, { mutualCount: number; reasons: Set<SuggestionReason>; matchingGenres: string[] }>();

      // Step 1: Get current friends to exclude them
      const { data: myFriendships, error: myFriendshipsError } = await supabase
        .from('friendships')
        .select('requester_id, addressee_id')
        .eq('status', 'accepted')
        .or(`requester_id.eq.${profile.id},addressee_id.eq.${profile.id}`);

      if (myFriendshipsError) throw myFriendshipsError;

      const myFriendIds = (myFriendships || []).map(f => 
        f.requester_id === profile.id ? f.addressee_id : f.requester_id
      );
      myFriendIds.forEach(id => excludeIds.add(id));

      // Also exclude pending requests
      const { data: pendingFriendships } = await supabase
        .from('friendships')
        .select('requester_id, addressee_id')
        .eq('status', 'pending')
        .or(`requester_id.eq.${profile.id},addressee_id.eq.${profile.id}`);

      (pendingFriendships || []).forEach(f => {
        excludeIds.add(f.requester_id);
        excludeIds.add(f.addressee_id);
      });

      // Step 2: Get friends-of-friends (mutual connections)
      if (myFriendIds.length > 0) {
        const { data: fofFriendships, error: fofError } = await supabase
          .from('friendships')
          .select('requester_id, addressee_id')
          .eq('status', 'accepted')
          .or(myFriendIds.map(id => `requester_id.eq.${id},addressee_id.eq.${id}`).join(','));

        if (fofError) throw fofError;

        (fofFriendships || []).forEach(f => {
          const otherId = myFriendIds.includes(f.requester_id) ? f.addressee_id : f.requester_id;
          if (!excludeIds.has(otherId)) {
            const existing = suggestionMap.get(otherId) || { mutualCount: 0, reasons: new Set(), matchingGenres: [] };
            existing.mutualCount += 1;
            existing.reasons.add('mutual');
            suggestionMap.set(otherId, existing);
          }
        });
      }

      // Step 3: Get users open to collaborate
      const { data: collaborators, error: collabError } = await supabase
        .from('profiles')
        .select('id, genres')
        .eq('open_to_collaborate', true)
        .neq('id', profile.id)
        .limit(50);

      if (collabError) throw collabError;

      (collaborators || []).forEach(user => {
        if (!excludeIds.has(user.id)) {
          const existing = suggestionMap.get(user.id) || { mutualCount: 0, reasons: new Set(), matchingGenres: [] };
          existing.reasons.add('collaborate');
          
          // Check for genre overlap
          const userGenres = user.genres || [];
          const overlap = myGenres.filter(g => userGenres.includes(g));
          if (overlap.length > 0) {
            existing.reasons.add('genre');
            existing.matchingGenres = overlap;
          }
          
          suggestionMap.set(user.id, existing);
        }
      });

      // Step 4: Get users with matching genres (even if not open to collaborate)
      if (myGenres.length > 0) {
        const { data: genreMatches, error: genreError } = await supabase
          .from('profiles')
          .select('id, genres')
          .neq('id', profile.id)
          .overlaps('genres', myGenres)
          .limit(50);

        if (genreError) throw genreError;

        (genreMatches || []).forEach(user => {
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
      }

      // Step 5: Fetch full profiles for all suggestions
      const suggestionIds = Array.from(suggestionMap.keys());
      if (suggestionIds.length === 0) return [];

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', suggestionIds)
        .limit(15);

      if (profilesError) throw profilesError;

      // Score and sort suggestions
      return (profiles || [])
        .map(p => {
          const meta = suggestionMap.get(p.id) || { mutualCount: 0, reasons: new Set(), matchingGenres: [] };
          return {
            ...p,
            mutualCount: meta.mutualCount,
            reasons: Array.from(meta.reasons) as SuggestionReason[],
            matchingGenres: meta.matchingGenres,
          };
        })
        .sort((a, b) => {
          // Score: mutual connections worth 3, collaborate worth 2, genre worth 1
          const scoreA = a.mutualCount * 3 + (a.reasons.includes('collaborate') ? 2 : 0) + (a.reasons.includes('genre') ? 1 : 0);
          const scoreB = b.mutualCount * 3 + (b.reasons.includes('collaborate') ? 2 : 0) + (b.reasons.includes('genre') ? 1 : 0);
          return scoreB - scoreA;
        });
    },
    enabled: !!profile?.id,
  });
}
