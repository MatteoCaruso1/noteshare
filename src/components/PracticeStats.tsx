import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { usePracticeStats } from '@/hooks/usePracticeStats';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Flame, Trophy, CalendarDays, Calendar } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarHeatmap } from './CalendarHeatmap';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface PracticeStatsProps {
  profileId: string;
}

export function PracticeStats({ profileId }: PracticeStatsProps) {
  const { data: stats, isLoading, error, isFetching } = usePracticeStats(profileId);

  // Fetch all weekly goals for the calendar heatmap
  const { data: weeklyGoals } = useQuery({
    queryKey: ['weekly-goals-all', profileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('weekly_goals')
        .select('week_start, target_minutes, skipped')
        .eq('user_id', profileId);
      if (error) throw error;
      return (data || []).map(g => ({
        weekStart: g.week_start,
        targetMinutes: g.target_minutes,
        skipped: g.skipped,
      }));
    },
    enabled: !!profileId,
    staleTime: 5 * 60 * 1000,
  });

  // Compute trend callouts from existing weeklyMinutesOverTime data (no new queries)
  const trends = useMemo(() => {
    if (!stats) return null;
    const weeks = stats.weeklyMinutesOverTime;
    if (!weeks || weeks.length < 2) return null;

    // Current week: project pace to end of Sunday (7 days, Mon=1)
    const thisWeekMin = weeks[weeks.length - 1].minutes;
    const lastWeekMin = weeks[weeks.length - 2].minutes;
    const now = new Date();
    // day of week: 0=Sun,1=Mon,...6=Sat → days elapsed in Mon-Sun week
    const jsDay = now.getDay();
    const daysElapsed = jsDay === 0 ? 7 : jsDay; // Sunday = 7th day
    const projectedWeekTotal = daysElapsed > 0 ? Math.round((thisWeekMin / daysElapsed) * 7) : thisWeekMin;
    const weekPctChange = lastWeekMin > 0
      ? Math.round(((projectedWeekTotal - lastWeekMin) / lastWeekMin) * 100)
      : projectedWeekTotal > 0 ? 100 : 0;

    // Monthly: sum current month weeks vs previous month weeks
    // Last 4 weeks = this month approximation, 4 before that = last month
    const thisMonthWeeks = weeks.slice(-4);
    const lastMonthWeeks = weeks.slice(-8, -4);
    const thisMonthTotal = thisMonthWeeks.reduce((s, w) => s + w.minutes, 0);
    const lastMonthTotal = lastMonthWeeks.reduce((s, w) => s + w.minutes, 0);

    // Projection: current month pace extrapolated to full month
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const avgPerDay = dayOfMonth > 0 ? thisMonthTotal / dayOfMonth : 0;
    const projectedTotal = Math.round(avgPerDay * daysInMonth);
    const monthPctChange = lastMonthTotal > 0
      ? Math.round(((projectedTotal - lastMonthTotal) / lastMonthTotal) * 100)
      : projectedTotal > 0 ? 100 : 0;

    return { weekPctChange, thisWeekMin, lastWeekMin, thisMonthTotal, lastMonthTotal, projectedTotal, monthPctChange };
  }, [stats?.weeklyMinutesOverTime]);


  const trendColor = (pct: number) =>
    pct > 0 ? 'text-green-500' : pct < 0 ? 'text-red-500' : 'text-muted-foreground';


  const formatMinutes = (mins: number) => {
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    const remaining = mins % 60;
    return remaining > 0 ? `${hours}h ${remaining}m` : `${hours}h`;
  };

  // Show error state
  if (error) {
    return (
      <Card className="p-4 bg-card border-border">
        <p className="text-sm text-muted-foreground text-center">
          Unable to load stats. Pull down to refresh.
        </p>
      </Card>
    );
  }

  if (isLoading && !stats) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full animate-pulse" />
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Section: Progress */}
      <Card className="p-4 bg-card border-border">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Progress</h3>
        </div>
        
        {/* Line Chart */}
        <p className="text-sm text-muted-foreground mb-2">
          Minutes practiced per week
          {trends && trends.lastWeekMin > 0 && trends.thisWeekMin > 0 && (
            <span className={`ml-1 ${trendColor(trends.weekPctChange)}`}>
              (on pace to be {trends.weekPctChange === 0
                ? 'the same as'
                : `${Math.abs(trends.weekPctChange)}% ${trends.weekPctChange > 0 ? 'higher than' : 'lower than'}`} last week)
            </span>
          )}
        </p>
        <div className="h-40 mb-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={stats.weeklyMinutesOverTime}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis 
                dataKey="week" 
                tick={{ fontSize: 10 }} 
                className="text-muted-foreground"
                tickLine={false}
              />
              <YAxis 
                tick={{ fontSize: 10 }} 
                className="text-muted-foreground"
                tickLine={false}
                width={36}
                tickFormatter={(value) => `${value}`}
                domain={[0, (dataMax: number) => {
                  if (dataMax <= 60) return 60;
                  if (dataMax <= 120) return 120;
                  if (dataMax <= 180) return 180;
                  if (dataMax <= 240) return 240;
                  if (dataMax <= 300) return 300;
                  if (dataMax <= 360) return 360;
                  if (dataMax <= 480) return 480;
                  if (dataMax <= 600) return 600;
                  return Math.ceil(dataMax / 120) * 120;
                }]}
                ticks={(() => {
                  const maxMinutes = Math.max(...(stats.weeklyMinutesOverTime?.map(d => d.minutes) || [0]), 60);
                  let interval: number;
                  if (maxMinutes <= 60) interval = 30;
                  else if (maxMinutes <= 120) interval = 30;
                  else if (maxMinutes <= 240) interval = 60;
                  else if (maxMinutes <= 360) interval = 90;
                  else if (maxMinutes <= 480) interval = 120;
                  else interval = 120;
                  
                  const maxTick = Math.ceil(maxMinutes / interval) * interval;
                  const ticks = [];
                  for (let i = 0; i <= maxTick; i += interval) {
                    ticks.push(i);
                  }
                  return ticks;
                })()}
                interval={0}
                allowDecimals={false}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  borderColor: 'hsl(var(--border))',
                  borderRadius: '8px'
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
                formatter={(value: number) => [
                  `${formatMinutes(value)}`,
                  'Practice time'
                ]}
              />
              <Line 
                type="monotone" 
                dataKey="minutes" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>


        {/* Streaks — connected row */}
        <div className="rounded-lg bg-muted/50 p-2 sm:p-3 mb-2">
          <div className="flex items-center gap-1.5 mb-2">
            <Flame className="w-4 h-4 text-primary" />
            <span className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide">Streaks</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col items-center text-center">
              <p className="text-sm sm:text-lg font-bold whitespace-nowrap">{stats.currentStreak}d</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Current</p>
            </div>
            <div className="flex flex-col items-center text-center">
              <p className="text-sm sm:text-lg font-bold whitespace-nowrap">{stats.bestDailyStreak}d</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Best</p>
            </div>
          </div>
        </div>

        {/* Personal Bests — connected row with single icon */}
        <div className="rounded-lg bg-muted/50 p-2 sm:p-3 mb-2">
          <div className="flex items-center gap-1.5 mb-2">
            <Trophy className="w-4 h-4 text-primary" />
            <span className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide">Personal Bests</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col items-center text-center">
              <p className="text-sm sm:text-lg font-bold whitespace-nowrap">{stats.bestDayMinutes ? formatMinutes(stats.bestDayMinutes.minutes) : '0m'}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Best Day</p>
            </div>
            <div className="flex flex-col items-center text-center">
              <p className="text-sm sm:text-lg font-bold whitespace-nowrap">{stats.bestWeekMinutes ? formatMinutes(stats.bestWeekMinutes.minutes) : '0m'}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Best Week</p>
            </div>
            <div className="flex flex-col items-center text-center">
              <p className="text-sm sm:text-lg font-bold whitespace-nowrap">{stats.bestMonthMinutes ? formatMinutes(stats.bestMonthMinutes.minutes) : '0m'}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Best Month</p>
            </div>
          </div>
        </div>

        {/* Monthly Summary — connected row */}
        <div className="rounded-lg bg-muted/50 p-2 sm:p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide">Monthly</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col items-center text-center">
              <p className="text-sm sm:text-lg font-bold whitespace-nowrap">{trends ? formatMinutes(trends.thisMonthTotal) : '0m'}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">This Month</p>
            </div>
            <div className="flex flex-col items-center text-center">
              <p className="text-sm sm:text-lg font-bold whitespace-nowrap">{trends ? formatMinutes(trends.projectedTotal) : '0m'}</p>
              <p className={`text-[10px] sm:text-xs ${trends && trends.lastMonthTotal > 0 ? trendColor(trends.monthPctChange) : 'text-muted-foreground'}`}>
                On Pace
                {trends && trends.lastMonthTotal > 0 && (
                  <span> ({trends.monthPctChange > 0 ? '+' : ''}{trends.monthPctChange}%)</span>
                )}
              </p>
            </div>
            <div className="flex flex-col items-center text-center">
              <p className="text-sm sm:text-lg font-bold whitespace-nowrap">{formatMinutes(stats.lastMonthTotal)}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Last Month</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Section: Calendar Heatmap */}
      <Card className="p-4 bg-card border-border">
        <div className="flex items-center gap-2 mb-3">
          <CalendarDays className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Practice Calendar</h3>
        </div>
        <CalendarHeatmap dailyMinutesMap={stats.dailyMinutesMap} weeklyGoals={weeklyGoals} />
      </Card>
    </div>
  );
}
