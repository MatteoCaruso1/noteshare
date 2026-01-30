import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface GroupInvite {
  id: string;
  group_id: string;
  invited_by: string;
  invited_user_id: string;
  status: string;
  created_at: string;
  responded_at: string | null;
  group?: {
    id: string;
    name: string;
    cover_image: string | null;
    privacy: string;
  };
  inviter?: {
    id: string;
    name: string;
    avatar: string | null;
  };
  invited_user?: {
    id: string;
    name: string;
    avatar: string | null;
  };
}

// Fetch invites received by current user
export function useMyGroupInvites() {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ['group-invites', 'received', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      
      const { data, error } = await supabase
        .from('group_invites')
        .select(`
          *,
          group:groups!group_invites_group_id_fkey (
            id,
            name,
            cover_image,
            privacy
          ),
          inviter:profiles!group_invites_invited_by_fkey (
            id,
            name,
            avatar
          )
        `)
        .eq('invited_user_id', profile.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as GroupInvite[];
    },
    enabled: !!profile?.id,
  });
}

// Fetch pending join requests for a group (admin view)
export function usePendingJoinRequests(groupId: string | undefined) {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ['group-pending-requests', groupId],
    queryFn: async () => {
      if (!groupId) return [];
      
      const { data, error } = await supabase
        .from('group_members')
        .select(`
          *,
          profile:profiles!group_members_user_id_fkey (
            id,
            name,
            avatar,
            username
          )
        `)
        .eq('group_id', groupId)
        .eq('status', 'pending')
        .order('joined_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!groupId && !!profile?.id,
  });
}

// Create an invitation
export function useCreateGroupInvite() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  
  return useMutation({
    mutationFn: async ({ groupId, invitedUserId, groupName }: { 
      groupId: string; 
      invitedUserId: string;
      groupName: string;
    }) => {
      if (!profile?.id) throw new Error('Not authenticated');
      
      // Create the invite
      const { data: invite, error: inviteError } = await supabase
        .from('group_invites')
        .insert({
          group_id: groupId,
          invited_by: profile.id,
          invited_user_id: invitedUserId,
        })
        .select()
        .single();
      
      if (inviteError) throw inviteError;
      
      // Also create a notification
      await supabase
        .from('notifications')
        .insert({
          user_id: invitedUserId,
          type: 'group_invite',
          content: `invited you to join "${groupName}"`,
          from_user_id: profile.id,
        });
      
      return invite;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-invites'] });
      toast.success('Invitation sent!');
    },
    onError: (error: Error) => {
      console.error('Failed to send invite:', error);
      if (error.message.includes('duplicate')) {
        toast.error('Already invited this user');
      } else {
        toast.error('Failed to send invitation');
      }
    },
  });
}

// Accept an invitation
export function useAcceptGroupInvite() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  
  return useMutation({
    mutationFn: async ({ inviteId, groupId }: { inviteId: string; groupId: string }) => {
      if (!profile?.id) throw new Error('Not authenticated');
      
      // Update invite status
      const { error: updateError } = await supabase
        .from('group_invites')
        .update({ 
          status: 'accepted',
          responded_at: new Date().toISOString(),
        })
        .eq('id', inviteId);
      
      if (updateError) throw updateError;
      
      // Join the group
      const { error: joinError } = await supabase
        .from('group_members')
        .insert({
          group_id: groupId,
          user_id: profile.id,
          role: 'member',
          status: 'active',
        });
      
      if (joinError) throw joinError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-invites'] });
      queryClient.invalidateQueries({ queryKey: ['my-groups'] });
      queryClient.invalidateQueries({ queryKey: ['group-membership'] });
      toast.success('Joined group!');
    },
    onError: (error) => {
      console.error('Failed to accept invite:', error);
      toast.error('Failed to join group');
    },
  });
}

// Decline an invitation
export function useDeclineGroupInvite() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (inviteId: string) => {
      const { error } = await supabase
        .from('group_invites')
        .update({ 
          status: 'declined',
          responded_at: new Date().toISOString(),
        })
        .eq('id', inviteId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-invites'] });
      toast.success('Invitation declined');
    },
    onError: (error) => {
      console.error('Failed to decline invite:', error);
      toast.error('Failed to decline invitation');
    },
  });
}

// Approve a join request (admin action)
export function useApproveJoinRequest() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ memberId, groupId }: { memberId: string; groupId: string }) => {
      const { error } = await supabase
        .from('group_members')
        .update({ status: 'active' })
        .eq('id', memberId);
      
      if (error) throw error;
      return { memberId, groupId };
    },
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: ['group-pending-requests', groupId] });
      queryClient.invalidateQueries({ queryKey: ['group-members', groupId] });
      queryClient.invalidateQueries({ queryKey: ['group-detail', groupId] });
      toast.success('Member approved!');
    },
    onError: (error) => {
      console.error('Failed to approve request:', error);
      toast.error('Failed to approve request');
    },
  });
}

// Reject a join request (admin action)
export function useRejectJoinRequest() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ memberId, groupId }: { memberId: string; groupId: string }) => {
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('id', memberId);
      
      if (error) throw error;
      return { memberId, groupId };
    },
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: ['group-pending-requests', groupId] });
      toast.success('Request rejected');
    },
    onError: (error) => {
      console.error('Failed to reject request:', error);
      toast.error('Failed to reject request');
    },
  });
}
