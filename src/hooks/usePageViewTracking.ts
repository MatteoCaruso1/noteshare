import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * Hook to track page views for analytics purposes.
 * Logs a page view when the component mounts (fire-and-forget).
 * Only logs for authenticated users.
 */
export const usePageViewTracking = (pageName: string) => {
  const { user } = useAuth();
  const hasTracked = useRef(false);

  useEffect(() => {
    // Only track once per mount and only for authenticated users
    if (!user?.id || hasTracked.current) return;
    
    hasTracked.current = true;

    // Fire-and-forget - don't await or handle errors to avoid blocking UI
    supabase
      .from('page_views')
      .insert({
        user_id: user.id,
        page_name: pageName,
      })
      .then(({ error }) => {
        if (error) {
          // Silent fail - analytics should never break the app
          console.debug('Page view tracking error:', error.message);
        }
      });
  }, [user?.id, pageName]);
};
