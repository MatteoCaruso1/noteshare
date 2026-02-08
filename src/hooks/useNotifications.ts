import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  content: string;
  note_id: string | null;
  from_user_id: string | null;
  read: boolean;
  created_at: string;
  from_user?: {
    id: string;
    name: string;
    username: string;
    avatar: string | null;
  };
  // For grouped applause notifications
  grouped_count?: number;
  other_users?: Array<{
    id: string;
    name: string;
    avatar: string | null;
  }>;
}

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      // Only show notifications where created_at is in the past (for scheduled reminders)
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          profiles!notifications_from_user_id_fkey (id, name, username, avatar)
        `)
        .lte('created_at', now) // Only show notifications that should be visible now
        .order('created_at', { ascending: false })
        .limit(100); // Fetch more to group applause

      if (error) throw error;
      
      const rawNotifications = data.map((n: any) => ({
        ...n,
        from_user: n.profiles,
      })) as Notification[];
      
      // Group applause notifications by note_id
      const groupedNotifications: Notification[] = [];
      const applauseByNote = new Map<string, Notification[]>();
      
      for (const notification of rawNotifications) {
        if (notification.type === 'applause' && notification.note_id) {
          const existing = applauseByNote.get(notification.note_id);
          if (existing) {
            existing.push(notification);
          } else {
            applauseByNote.set(notification.note_id, [notification]);
          }
        } else {
          groupedNotifications.push(notification);
        }
      }
      
      // Convert grouped applause to single notifications
      for (const [noteId, applauseNotifs] of applauseByNote) {
        // Sort by created_at descending to get the most recent first
        applauseNotifs.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        
        const mostRecent = applauseNotifs[0];
        const otherCount = applauseNotifs.length - 1;
        
        // Create grouped notification
        const groupedNotif: Notification = {
          ...mostRecent,
          grouped_count: applauseNotifs.length,
          // Check if ANY of the applause notifications are unread
          read: applauseNotifs.every(n => n.read),
          content: otherCount > 0 
            ? `and ${otherCount} ${otherCount === 1 ? 'other' : 'others'} gave you applause on your note`
            : 'gave you applause on your note',
          other_users: applauseNotifs.slice(1, 4).map(n => n.from_user).filter(Boolean) as Array<{
            id: string;
            name: string;
            avatar: string | null;
          }>,
        };
        
        groupedNotifications.push(groupedNotif);
      }
      
      // Sort all notifications by created_at
      groupedNotifications.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      return groupedNotifications.slice(0, 50);
    },
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: async () => {
      // Only count notifications that should be visible now (not future scheduled ones)
      const now = new Date().toISOString();
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('read', false)
        .lte('created_at', now);

      if (error) throw error;
      return count || 0;
    },
    staleTime: 30 * 1000, // Consider data fresh for 30 seconds
    gcTime: 5 * 60 * 1000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('read', false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });
}

export function useCreateNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      type,
      content,
      noteId,
      fromUserId,
    }: {
      userId: string;
      type: string;
      content: string;
      noteId?: string;
      fromUserId: string;
    }) => {
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          type,
          content,
          note_id: noteId,
          from_user_id: fromUserId,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
