import { useId } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Trophy } from 'lucide-react';
import { format } from 'date-fns';

interface RankingData {
  user_minutes: number;
  percentile: number;
  rank: number;
  total_users: number;
  next_tier_pct: number | null;
  minutes_to_next_tier: number | null;
}

function formatMinutesHM(totalMinutes: number): { hours: number; minutes: number; display: string } {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);
  if (hours === 0) return { hours: 0, minutes, display: `${minutes}m` };
  if (minutes === 0) return { hours, minutes: 0, display: `${hours}h` };
  return { hours, minutes, display: `${hours}h ${minutes}m` };
}

// Inflate rank to ~2000 active user scale
function inflateRank(rank: number, totalUsers: number): number {
  if (totalUsers <= 0) return rank;
  const fraction = rank / totalUsers;
  return Math.max(1, Math.round(fraction * 2000));
}

// Semi-circle gauge — just the arc, no vertical end caps
function GaugeArc({ percent, size = 200 }: { percent: number; size?: number }) {
  const gradientId = useId().replace(/:/g, '');
  const cx = size / 2;
  const cy = size / 2 + 10;
  const r = size / 2 - 16;
  const strokeW = 14;
  const viewHeight = cy + strokeW / 2 + 4;
  const clamped = Math.max(0, Math.min(100, percent));
  const fillFraction = 1 - clamped / 100;
  const filledPercent = fillFraction * 100;

  const arcPath = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;

  return (
    <svg viewBox={`0 0 ${size} ${viewHeight}`} className="mx-auto w-full max-w-[240px]" aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="hsl(var(--primary))" />
          <stop offset="100%" stopColor="hsl(var(--accent))" />
        </linearGradient>
      </defs>

      <path
        d={arcPath}
        fill="none"
        stroke="hsl(var(--muted))"
        strokeWidth={strokeW}
        strokeLinecap="butt"
      />

      <path
        d={arcPath}
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth={strokeW}
        strokeLinecap="butt"
        pathLength={100}
        strokeDasharray={`${filledPercent} 100`}
        className="transition-all duration-1000"
      />
    </svg>
  );
}

export function PracticeRanking({ profileId }: { profileId: string | undefined }) {
  const { data: ranking, isLoading } = useQuery({
    queryKey: ['monthly-ranking', profileId],
    queryFn: async () => {
      if (!profileId) return null;
      const { data, error } = await supabase.rpc('get_monthly_ranking', {
        p_profile_id: profileId,
      });
      if (error) throw error;
      return data as unknown as RankingData;
    },
    enabled: !!profileId,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading || !ranking) {
    return (
      <Card className="p-5 bg-card border-border">
        <div className="h-48 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground text-sm">Loading ranking...</div>
        </div>
      </Card>
    );
  }

  const monthName = format(new Date(), 'MMMM');
  const pct = ranking.percentile;
  const { display: practiceDisplay } = formatMinutesHM(ranking.user_minutes);
  const nextTierMinutes = ranking.minutes_to_next_tier;
  const nextTierPct = ranking.next_tier_pct;
  const { hours: nextH, minutes: nextM } = formatMinutesHM(nextTierMinutes || 0);
  const inflatedRank = inflateRank(ranking.rank, ranking.total_users);

  return (
    <Card className="p-5 bg-card border-border overflow-hidden">
      <div className="text-center">
        {/* Main headline */}
        <p className="text-base sm:text-lg text-muted-foreground leading-snug mb-1">
          You're in the{' '}
          <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-[hsl(340,80%,65%)] to-[hsl(250,60%,55%)]">
            top {pct}%
          </span>
          {' '}of
        </p>
        <p className="text-base sm:text-lg text-foreground font-semibold mb-4">
          practicers in {monthName}
        </p>

        {/* Gauge */}
        <div className="relative -mb-2">
          <GaugeArc percent={pct} />
          {/* Center content overlaid on gauge */}
          <div className="absolute inset-0 flex flex-col items-center justify-end pb-4">
            <span className="text-4xl sm:text-5xl font-bold text-foreground leading-none">
              {pct}%
            </span>
            <span className="text-sm text-muted-foreground mt-1">
              {practiceDisplay}
            </span>
          </div>
        </div>

        {/* Rank row */}
        <div className="flex gap-3 mt-4 mb-4">
          <div className="flex-1 bg-muted/40 rounded-xl p-3">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Trophy className="w-3.5 h-3.5 text-primary" />
              <span className="text-lg font-bold text-foreground">#{inflatedRank}</span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              ranked practicer
            </p>
          </div>
          <div className="flex-1 bg-muted/40 rounded-xl p-3">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <span className="text-lg font-bold text-foreground">{practiceDisplay}</span>
            </div>
            <p className="text-[10px] text-muted-foreground">
              practiced this month
            </p>
          </div>
        </div>

        {/* Next tier text */}
        {nextTierPct !== null && nextTierMinutes !== null && nextTierMinutes > 0 && (
          <p className="text-sm text-muted-foreground leading-relaxed">
            You're{' '}
            <span className="font-semibold text-transparent bg-clip-text bg-gradient-to-r from-[hsl(340,80%,65%)] to-[hsl(250,60%,55%)]">
              {nextH > 0 ? `${nextH} hour${nextH !== 1 ? 's' : ''}` : ''}
              {nextH > 0 && nextM > 0 ? ' and ' : ''}
              {nextM > 0 ? `${nextM} minute${nextM !== 1 ? 's' : ''}` : ''}
            </span>{' '}
            away from moving into the top {nextTierPct}%.
          </p>
        )}
        {nextTierPct === null && (
          <p className="text-sm text-muted-foreground">
            🎉 You're at the very top! Keep it up!
          </p>
        )}
      </div>
    </Card>
  );
}
