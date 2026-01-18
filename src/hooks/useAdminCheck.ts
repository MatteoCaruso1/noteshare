import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * Hook to check if the current user is an admin.
 * Returns loading state and admin status.
 */
export const useAdminCheck = () => {
  const { user } = useAuth();

  const { data: isAdmin, isLoading } = useQuery({
    queryKey: ['admin-check', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;

      const { data, error } = await supabase
        .from('admin_users')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Admin check error:', error);
        return false;
      }

      return !!data;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  return {
    isAdmin: isAdmin ?? false,
    isLoading,
  };
};
