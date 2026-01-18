import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface DailyCount {
  date: string;
  count: number;
}

interface RollingAverage {
  date: string;
  average: number;
}

interface ActivationRate {
  date: string;
  viewers: number;
  creators: number;
  rate: number;
}

interface AnalyticsData {
  noteActivatedUsers: {
    dailyCounts: DailyCount[];
    rollingAverage7d: RollingAverage[];
  };
  noteActivationRate: {
    dailyRates: ActivationRate[];
  };
  metadata: {
    daysRequested: number;
    startDate: string;
    generatedAt: string;
  };
}

/**
 * Hook to fetch analytics data from the backend.
 * Only works for admin users.
 */
export const useAnalytics = (days: number = 30) => {
  return useQuery<AnalyticsData>({
    queryKey: ['analytics', days],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('get-analytics', {
        body: null,
        method: 'GET',
      });

      // supabase.functions.invoke doesn't support query params directly,
      // so we need to use a workaround with the URL
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-analytics?days=${days}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch analytics');
      }

      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });
};
