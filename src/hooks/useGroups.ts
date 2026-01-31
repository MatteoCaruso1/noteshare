import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface Group {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  cover_image: string | null;
  profile_image: string | null;
  focus_type: string;
  focus_details: string[] | null;
  group_type: string[];
  privacy: string;
  location_type: string;
  city: string | null;
  member_count: number;
  created_at: string;
  updated_at: string;
  owner?: {
    id: string;
    name: string;
    avatar: string | null;
  };
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: string;
  status: string;
  joined_at: string;
  profile?: {
    id: string;
    name: string;
    avatar: string | null;
  };
}

export interface CreateGroupData {
  name: string;
  description?: string;
  cover_image?: string;
  focus_type: string;
  focus_details?: string[];
  group_type: string[];
  privacy: string;
  location_type: string;
  city?: string;
}

// Fetch user's active groups (groups they're a member of)
export function useMyGroups() {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ['my-groups', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      
      const { data, error } = await supabase
        .from('group_members')
        .select(`
          group_id,
          role,
          status,
          groups (
            id,
            name,
            description,
            cover_image,
            profile_image,
            focus_type,
            focus_details,
            group_type,
            privacy,
            location_type,
            city,
            member_count,
            created_at,
            owner_id
          )
        `)
        .eq('user_id', profile.id)
        .eq('status', 'active');
      
      if (error) throw error;
      
      // Transform to return groups with membership info
      return (data || []).map(item => ({
        ...item.groups,
        myRole: item.role,
      })) as (Group & { myRole: string })[];
    },
    enabled: !!profile?.id,
  });
}

// Fetch all discoverable groups (for Find tab)
export function useDiscoverGroups(searchQuery?: string) {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ['discover-groups', searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('groups')
        .select(`
          *,
          owner:profiles!groups_owner_id_fkey (
            id,
            name,
            avatar
          )
        `)
        .eq('privacy', 'public')
        .order('member_count', { ascending: false });
      
      if (searchQuery && searchQuery.trim()) {
        query = query.or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,city.ilike.%${searchQuery}%`);
      }
      
      const { data, error } = await query.limit(50);
      
      if (error) throw error;
      return data as Group[];
    },
    enabled: !!profile?.id,
  });
}

// Check if user is a member of a group
export function useGroupMembership(groupId: string | undefined) {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ['group-membership', groupId, profile?.id],
    queryFn: async () => {
      if (!groupId || !profile?.id) return null;
      
      const { data, error } = await supabase
        .from('group_members')
        .select('*')
        .eq('group_id', groupId)
        .eq('user_id', profile.id)
        .maybeSingle();
      
      if (error) throw error;
      return data as GroupMember | null;
    },
    enabled: !!groupId && !!profile?.id,
  });
}

// Create a new group
export function useCreateGroup() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  
  return useMutation({
    mutationFn: async (data: CreateGroupData) => {
      if (!profile?.id) throw new Error('Not authenticated');
      
      // Validate required fields
      if (!data.name?.trim()) throw new Error('Group name is required');
      if (!data.focus_type) throw new Error('Focus type is required');
      if (!data.group_type?.length) throw new Error('Group type is required');
      
      console.log('[useCreateGroup] Creating group with data:', { 
        name: data.name, 
        focus_type: data.focus_type,
        group_type: data.group_type,
        privacy: data.privacy,
      });
      
      // Create the group
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .insert({
          owner_id: profile.id,
          name: data.name.trim(),
          description: data.description?.trim() || null,
          cover_image: data.cover_image || null,
          focus_type: data.focus_type,
          focus_details: data.focus_details || [],
          group_type: data.group_type,
          privacy: data.privacy || 'public',
          location_type: data.location_type || 'global',
          city: data.city?.trim() || null,
        })
        .select()
        .single();
      
      if (groupError) {
        console.error('[useCreateGroup] Failed to insert group:', groupError);
        throw groupError;
      }
      
      console.log('[useCreateGroup] Group created, adding owner as admin:', group.id);
      
      // Add owner as admin member
      const { error: memberError } = await supabase
        .from('group_members')
        .insert({
          group_id: group.id,
          user_id: profile.id,
          role: 'admin',
          status: 'active',
        });
      
      if (memberError) {
        console.error('[useCreateGroup] Failed to add owner as member:', memberError);
        throw memberError;
      }
      
      console.log('[useCreateGroup] Group creation complete:', group.id);
      return group as Group;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-groups'] });
      queryClient.invalidateQueries({ queryKey: ['discover-groups'] });
      toast.success('Group created successfully!');
    },
    onError: (error: Error) => {
      console.error('[useCreateGroup] Error:', error);
      const message = error.message || 'Failed to create group';
      toast.error(message.includes('duplicate') ? 'A group with this name already exists' : message);
    },
  });
}

// Join a group
export function useJoinGroup() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  
  return useMutation({
    mutationFn: async ({ groupId, isPrivate, hasInvite }: { 
      groupId: string; 
      isPrivate: boolean;
      hasInvite?: boolean;
    }) => {
      if (!profile?.id) throw new Error('Not authenticated');
      
      // For private groups: if invited, join as active; otherwise, request (pending)
      // For public groups: always join as active
      const status = isPrivate && !hasInvite ? 'pending' : 'active';
      
      const { data, error } = await supabase
        .from('group_members')
        .insert({
          group_id: groupId,
          user_id: profile.id,
          role: 'member',
          status,
        })
        .select()
        .single();
      
      if (error) throw error;
      return { ...data, statusResult: status };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['my-groups'] });
      queryClient.invalidateQueries({ queryKey: ['group-membership'] });
      queryClient.invalidateQueries({ queryKey: ['group-invites'] });
      toast.success(data.statusResult === 'pending' ? 'Request to join sent!' : 'Joined group successfully!');
    },
    onError: (error) => {
      console.error('Failed to join group:', error);
      toast.error('Failed to join group');
    },
  });
}

// Leave a group
export function useLeaveGroup() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  
  return useMutation({
    mutationFn: async (groupId: string) => {
      if (!profile?.id) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', profile.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-groups'] });
      queryClient.invalidateQueries({ queryKey: ['group-membership'] });
      toast.success('Left group successfully');
    },
    onError: (error) => {
      console.error('Failed to leave group:', error);
      toast.error('Failed to leave group');
    },
  });
}
