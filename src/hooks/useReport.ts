import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

export function useReport() {
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({
      reportedItemType,
      reportedItemId,
      reportedUserId,
    }: {
      reportedItemType: 'comment' | 'group_post';
      reportedItemId: string;
      reportedUserId: string;
    }) => {
      if (!profile) throw new Error('Not authenticated');

      const { error } = await supabase.from('reports' as any).insert({
        reporter_id: profile.id,
        reported_item_type: reportedItemType,
        reported_item_id: reportedItemId,
        reported_user_id: reportedUserId,
        reason: 'inappropriate',
      } as any);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Report submitted. Thank you for helping keep the community safe.');
    },
    onError: () => {
      toast.error('Failed to submit report');
    },
  });
}
