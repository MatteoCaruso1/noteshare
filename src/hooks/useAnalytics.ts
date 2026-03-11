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

interface Day7Retention {
  date: string;
  cohortSize: number;
  retained: number;
  rate: number | null;
}

interface Day7RetentionToday {
  cohortSize: number;
  retained: number;
  rate: number | null;
}

interface PaidConversion {
  totalActive: number;
  inTrial: number;
  actuallyPaying: number;
}

interface TrialToPaidRate {
  trialsEndedLast7Days: number;
  converted: number;
  rate: number;
}

export interface PremiumUser {
  name: string;
  username: string;
  email: string;
  type: 'subscription' | 'lifetime' | 'trial' | 'override';
  status: string;
}

export interface NoteActivatedUser {
  name: string;
  username: string;
  noteCount: number;
}

export interface FriendCountUser {
  name: string;
  username: string;
  friendCount: number;
}

export interface TryProClickUser {
  name: string;
  username: string;
  clickCount: number;
}

export interface MobileSessionUser {
  name: string;
  username: string;
  mobileCount: number;
  totalCount: number;
  mobilePercent: number;
}

export interface FunnelUser {
  name: string;
  username: string;
  noteCount: number;
  friendCount: number;
}

export interface AllUser {
  name: string;
  username: string;
  email: string;
  noteCount: number;
  createdAt: string;
}

export interface AccountFunnel {
  accountsCreated: number;
  with1PlusNotes: number;
  with5PlusNotes: number;
  accountUsers: FunnelUser[];
  note1PlusUsers: FunnelUser[];
  note5PlusUsers: FunnelUser[];
}

export interface AnalyticsData {
  noteActivatedUsers: {
    dailyCounts: DailyCount[];
    rollingAverage7d: RollingAverage[];
    users: NoteActivatedUser[];
  };
  noteActivationRate: {
    dailyRates: ActivationRate[];
  };
  day7Retention: {
    dailyRates: Day7Retention[];
    today: Day7RetentionToday;
  };
  paidConversion: PaidConversion;
  trialToPaidRate: TrialToPaidRate;
  premiumUsers: PremiumUser[];
  friendCountUsers: FriendCountUser[];
  tryProClickUsers: TryProClickUser[];
  mobileSessionUsers: MobileSessionUser[];
  accountFunnel: AccountFunnel;
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
