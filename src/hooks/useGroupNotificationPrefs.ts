import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface GroupNotificationPrefs {
  mute_posts: boolean;
  mute_events: boolean;
}

// Fetch notification preferences for current user's membership in a group
export function useGroupNotificationPrefs(groupId: string | undefined) {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ['group-notification-prefs', groupId, profile?.id],
    queryFn: async () => {
      if (!groupId || !profile?.id) return null;
      
      const { data, error } = await supabase
        .from('group_members')
        .select('mute_posts, mute_events')
        .eq('group_id', groupId)
        .eq('user_id', profile.id)
        .maybeSingle();
      
      if (error) throw error;
      return data as GroupNotificationPrefs | null;
    },
    enabled: !!groupId && !!profile?.id,
  });
}

// Update notification preferences
export function useUpdateGroupNotificationPrefs() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  
  return useMutation({
    mutationFn: async ({ 
      groupId, 
      prefs 
    }: { 
      groupId: string; 
      prefs: Partial<GroupNotificationPrefs>;
    }) => {
      if (!profile?.id) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('group_members')
        .update(prefs)
        .eq('group_id', groupId)
        .eq('user_id', profile.id)
        .select('mute_posts, mute_events')
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: ['group-notification-prefs', groupId] });
      toast.success('Notification preferences updated');
    },
    onError: (error) => {
      console.error('Failed to update notification prefs:', error);
      toast.error('Failed to update preferences');
    },
  });
}
