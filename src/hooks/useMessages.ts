import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from './useAuth';
import { Profile } from '@/types';

export interface DirectMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  read: boolean;
  created_at: string;
  sender?: Profile;
  receiver?: Profile;
}

export interface Conversation {
  friendId: string;
  friend: Profile;
  lastMessage: DirectMessage;
  unreadCount: number;
}

export function useConversations() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['conversations', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];

      // Get all messages involving the current user
      const { data: messages, error } = await supabase
        .from('direct_messages')
        .select('id, sender_id, receiver_id, content, read, created_at')
        .or(`sender_id.eq.${profile.id},receiver_id.eq.${profile.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group messages by conversation partner
      const conversationMap = new Map<string, { messages: any[]; unread: number }>();
      
      messages.forEach(msg => {
        const partnerId = msg.sender_id === profile.id ? msg.receiver_id : msg.sender_id;
        if (!conversationMap.has(partnerId)) {
          conversationMap.set(partnerId, { messages: [], unread: 0 });
        }
        const conv = conversationMap.get(partnerId)!;
        conv.messages.push(msg);
        if (!msg.read && msg.receiver_id === profile.id) {
          conv.unread++;
        }
      });

      // Get partner profiles - only if we have conversations
      const partnerIds = Array.from(conversationMap.keys());
      if (partnerIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, username, avatar, current_streak')
        .in('id', partnerIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Build conversation list
      const conversations: Conversation[] = [];
      conversationMap.forEach((data, partnerId) => {
        const friend = profileMap.get(partnerId);
        if (friend) {
          conversations.push({
            friendId: partnerId,
            friend: friend as Profile,
            lastMessage: data.messages[0],
            unreadCount: data.unread,
          });
        }
      });

      return conversations.sort((a, b) => 
        new Date(b.lastMessage.created_at).getTime() - new Date(a.lastMessage.created_at).getTime()
      );
    },
    enabled: !!profile?.id,
    staleTime: 30 * 1000, // Consider data fresh for 30 seconds
    gcTime: 5 * 60 * 1000,
  });
}

export function useMessages(friendId: string | null) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['messages', profile?.id, friendId],
    queryFn: async () => {
      if (!profile?.id || !friendId) return [];

      const { data, error } = await supabase
        .from('direct_messages')
        .select('id, sender_id, receiver_id, content, read, created_at')
        .or(`and(sender_id.eq.${profile.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${profile.id})`)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Mark messages as read
      await supabase
        .from('direct_messages')
        .update({ read: true })
        .eq('receiver_id', profile.id)
        .eq('sender_id', friendId)
        .eq('read', false);

      return data as DirectMessage[];
    },
    enabled: !!profile?.id && !!friendId,
    refetchInterval: 5000, // Poll every 5 seconds for new messages
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({ receiverId, content }: { receiverId: string; content: string }) => {
      if (!profile?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('direct_messages')
        .insert({
          sender_id: profile.id,
          receiver_id: receiverId,
          content: content.trim(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, { receiverId }) => {
      queryClient.invalidateQueries({ queryKey: ['messages', profile?.id, receiverId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: (error) => {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    },
  });
}

export function useUnreadMessageCount() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ['unread-messages', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return 0;

      const { count, error } = await supabase
        .from('direct_messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', profile.id)
        .eq('read', false);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!profile?.id,
    refetchInterval: 10000,
  });
}
