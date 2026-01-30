import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface GroupDetail {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  cover_image: string | null;
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

export interface GroupEvent {
  id: string;
  group_id: string;
  created_by: string;
  name: string;
  description: string | null;
  event_date: string;
  event_type: string;
  is_virtual: boolean;
  location: string | null;
  created_at: string;
  creator?: {
    id: string;
    name: string;
    avatar: string | null;
  };
}

export interface GroupMemberWithProfile {
  id: string;
  group_id: string;
  user_id: string;
  role: string;
  status: string;
  joined_at: string;
  profile: {
    id: string;
    name: string;
    avatar: string | null;
  };
}

// Fetch a single group by ID
export function useGroupDetail(groupId: string | undefined) {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ['group-detail', groupId],
    queryFn: async () => {
      if (!groupId) return null;
      
      const { data, error } = await supabase
        .from('groups')
        .select(`
          *,
          owner:profiles!groups_owner_id_fkey (
            id,
            name,
            avatar
          )
        `)
        .eq('id', groupId)
        .maybeSingle();
      
      if (error) throw error;
      return data as GroupDetail | null;
    },
    enabled: !!groupId && !!profile?.id,
  });
}

// Fetch group members
export function useGroupMembers(groupId: string | undefined) {
  return useQuery({
    queryKey: ['group-members', groupId],
    queryFn: async () => {
      if (!groupId) return [];
      
      const { data, error } = await supabase
        .from('group_members')
        .select(`
          *,
          profile:profiles!group_members_user_id_fkey (
            id,
            name,
            avatar
          )
        `)
        .eq('group_id', groupId)
        .eq('status', 'active')
        .order('joined_at', { ascending: true });
      
      if (error) throw error;
      return data as GroupMemberWithProfile[];
    },
    enabled: !!groupId,
  });
}

// Fetch group events
export function useGroupEvents(groupId: string | undefined) {
  return useQuery({
    queryKey: ['group-events', groupId],
    queryFn: async () => {
      if (!groupId) return [];
      
      const { data, error } = await supabase
        .from('group_events')
        .select(`
          *,
          creator:profiles!group_events_created_by_fkey (
            id,
            name,
            avatar
          )
        `)
        .eq('group_id', groupId)
        .gte('event_date', new Date().toISOString())
        .order('event_date', { ascending: true });
      
      if (error) throw error;
      return data as GroupEvent[];
    },
    enabled: !!groupId,
  });
}

export interface CreateEventData {
  group_id: string;
  name: string;
  description?: string;
  event_date: string;
  event_type: string;
  is_virtual: boolean;
  location?: string;
}

// Create a group event
export function useCreateGroupEvent() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  
  return useMutation({
    mutationFn: async (data: CreateEventData) => {
      if (!profile?.id) throw new Error('Not authenticated');
      
      const { data: event, error } = await supabase
        .from('group_events')
        .insert({
          group_id: data.group_id,
          created_by: profile.id,
          name: data.name,
          description: data.description || null,
          event_date: data.event_date,
          event_type: data.event_type,
          is_virtual: data.is_virtual,
          location: data.location || null,
        })
        .select()
        .single();
      
      if (error) throw error;
      return event;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['group-events', variables.group_id] });
      toast.success('Event created!');
    },
    onError: (error) => {
      console.error('Failed to create event:', error);
      toast.error('Failed to create event');
    },
  });
}

// Update group details
export function useUpdateGroup() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      groupId, 
      updates 
    }: { 
      groupId: string; 
      updates: Partial<Pick<GroupDetail, 'name' | 'description' | 'cover_image' | 'focus_type' | 'focus_details' | 'group_type' | 'privacy' | 'location_type' | 'city'>> 
    }) => {
      const { data, error } = await supabase
        .from('groups')
        .update(updates)
        .eq('id', groupId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['group-detail', data.id] });
      queryClient.invalidateQueries({ queryKey: ['my-groups'] });
      queryClient.invalidateQueries({ queryKey: ['discover-groups'] });
      toast.success('Group updated!');
    },
    onError: (error) => {
      console.error('Failed to update group:', error);
      toast.error('Failed to update group');
    },
  });
}

// Delete a group
export function useDeleteGroup() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (groupId: string) => {
      const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', groupId);
      
      if (error) throw error;
      return groupId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-groups'] });
      queryClient.invalidateQueries({ queryKey: ['discover-groups'] });
      toast.success('Group deleted');
    },
    onError: (error) => {
      console.error('Failed to delete group:', error);
      toast.error('Failed to delete group');
    },
  });
}
