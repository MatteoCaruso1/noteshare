import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TrendingTag {
  tag: string;
  count: number;
}

export interface SuggestedUser {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
  is_ai: boolean;
  followers_count: number;
}

export function useTrendingTags() {
  return useQuery({
    queryKey: ['trendingTags'],
    queryFn: async (): Promise<TrendingTag[]> => {
      // Get posts from last 7 days
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      
      const { data: posts, error } = await supabase
        .from('posts')
        .select('tags')
        .gte('created_at', sevenDaysAgo);

      if (error) {
        console.error('Error fetching trending tags:', error);
        throw error;
      }

      // Count tag occurrences
      const tagCounts: Record<string, number> = {};
      for (const post of posts || []) {
        for (const tag of post.tags || []) {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        }
      }

      // Sort and return top 10
      return Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([tag, count]) => ({ tag, count }));
    },
    staleTime: 60000,
  });
}

export function useSuggestedUsers() {
  return useQuery({
    queryKey: ['suggestedUsers'],
    queryFn: async (): Promise<SuggestedUser[]> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, username, avatar, is_ai, followers_count')
        .order('followers_count', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Error fetching suggested users:', error);
        throw error;
      }

      return data || [];
    },
    staleTime: 60000,
  });
}
