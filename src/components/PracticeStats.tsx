import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { usePracticeStats } from '@/hooks/usePracticeStats';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingUp, Flame, Trophy, CalendarDays, Calendar, BarChart3, Share } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarHeatmap } from './CalendarHeatmap';
import { ShareCalendarSheet } from './ShareCalendarSheet';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface PracticeStatsProps {
  profileId: string;
}

export function PracticeStats({ profileId }: PracticeStatsProps) {
  const { profile } = useAuth();
  const { data: stats, isLoading, error, isFetching } = usePracticeStats(profileId);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [showShareCalendar, setShowShareCalendar] = useState(false);

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

  // Compute trend callouts from stats data
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

    // Monthly: use actual calendar month data from the hook
    const thisMonthTotal = stats.totalMinutesThisMonth;
    const lastMonthTotal = stats.lastMonthTotal;

    // Projection: current month pace extrapolated to full month
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    // Need at least 1 full day of data for a meaningful projection
    const avgPerDay = dayOfMonth > 0 ? thisMonthTotal / dayOfMonth : 0;
    const projectedTotal = Math.round(avgPerDay * daysInMonth);
    const paceAboveLastMonth = projectedTotal > lastMonthTotal;

    return { weekPctChange, thisWeekMin, lastWeekMin, thisMonthTotal, lastMonthTotal, projectedTotal, paceAboveLastMonth };
  }, [stats?.weeklyMinutesOverTime, stats?.totalMinutesThisMonth, stats?.lastMonthTotal]);


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
          <h3 className="font-semibold">Practice Time</h3>
        </div>
        
        {/* Line Chart */}
        {(() => {
          const chartData = (stats.weeklyMinutesOverTime || []).map(d => ({
            ...d,
            hours: Math.round((d.minutes / 60) * 100) / 100,
          }));
          const allTimeAvgHours = chartData.length > 0
            ? Math.round((chartData.reduce((s, d) => s + d.hours, 0) / chartData.length) * 100) / 100
            : 0;
          const maxHours = Math.max(...chartData.map(d => d.hours), allTimeAvgHours, 1);

          const formatHours = (h: number) => {
            const hrs = Math.floor(h);
            const mins = Math.round((h - hrs) * 60);
            if (hrs === 0 && mins === 0) return '0:00';
            return `${hrs}:${mins.toString().padStart(2, '0')}`;
          };

          // Compute tick interval in hours
          let interval: number;
          if (maxHours <= 1) interval = 0.5;
          else if (maxHours <= 2) interval = 0.5;
          else if (maxHours <= 4) interval = 1;
          else if (maxHours <= 8) interval = 2;
          else interval = 2;
          const maxTick = Math.ceil(maxHours / interval) * interval;
          const ticks: number[] = [];
          for (let i = 0; i <= maxTick; i += interval) {
            ticks.push(Math.round(i * 100) / 100);
          }

          return (
            <>
              <p className="text-sm text-muted-foreground mb-2">
                Time practiced per week
                {trends && trends.lastWeekMin > 0 && trends.thisWeekMin > 0 && (
                  <>
                    <br className="sm:hidden" />
                    <span className={`sm:ml-1 ${trendColor(trends.weekPctChange)}`}>
                      ({trends.weekPctChange === 0
                        ? 'trending the same this week vs. last'
                        : `trending ${Math.abs(trends.weekPctChange)}% ${trends.weekPctChange > 0 ? 'higher' : 'lower'} this week vs. last`})
                    </span>
                  </>
                )}
              </p>
              <div className="h-40 mb-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
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
                      width={40}
                      tickFormatter={formatHours}
                      domain={[0, maxTick]}
                      ticks={ticks}
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
                      formatter={(value: number, name: string) => {
                        if (name === 'hours') return [formatHours(value), 'Practice time'];
                        return [formatHours(value), name];
                      }}
                    />
                    <ReferenceLine
                      y={allTimeAvgHours}
                      stroke="hsl(var(--destructive))"
                      strokeWidth={1.5}
                      strokeDasharray="6 3"
                      label={{
                        value: `Avg ${formatHours(allTimeAvgHours)}`,
                        position: 'right',
                        fontSize: 10,
                        fill: 'hsl(var(--destructive))',
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="hours" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          );
        })()}


      </Card>

      {/* Section: Calendar Heatmap */}
      <Card className="p-4 bg-card border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Practice Calendar</h3>
          </div>
          <button
            onClick={() => setShowShareCalendar(true)}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Share calendar"
          >
            <Share className="w-4 h-4" />
          </button>
        </div>
        <CalendarHeatmap
          dailyMinutesMap={stats.dailyMinutesMap}
          weeklyGoals={weeklyGoals}
          currentMonth={calendarMonth}
          onMonthChange={setCalendarMonth}
        />
      </Card>

      <ShareCalendarSheet
        open={showShareCalendar}
        onOpenChange={setShowShareCalendar}
        dailyMinutesMap={stats.dailyMinutesMap}
        weeklyGoals={weeklyGoals}
        userName={profile?.name || 'My'}
        currentMonth={calendarMonth}
      />

      {/* Section: Deep-dives */}
      <Card className="p-4 bg-card border-border">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Deep-dives</h3>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* Time Records */}
          <div className="rounded-lg bg-muted/50 p-2 sm:p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Trophy className="w-4 h-4 text-primary" />
              <span className="text-xs sm:text-sm font-medium text-muted-foreground tracking-wide">Time Records</span>
            </div>
            <div className="space-y-2">
              <div className="flex flex-col items-center text-center">
                <p className="text-sm sm:text-lg font-bold whitespace-nowrap">{stats.bestWeekMinutes ? formatMinutes(stats.bestWeekMinutes.minutes) : '0m'}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Top Week</p>
              </div>
              <div className="flex flex-col items-center text-center">
                <p className="text-sm sm:text-lg font-bold whitespace-nowrap">{stats.bestMonthMinutes ? formatMinutes(stats.bestMonthMinutes.minutes) : '0m'}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Top Month</p>
              </div>
            </div>
          </div>

          {/* Monthly Minutes Practiced */}
          <div className="rounded-lg bg-muted/50 p-2 sm:p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="text-xs sm:text-sm font-medium text-muted-foreground tracking-wide">Monthly Time</span>
            </div>
            <div className="space-y-2">
              <div className="flex flex-col items-center text-center">
                <p className={`text-sm sm:text-lg font-bold whitespace-nowrap ${trends && trends.paceAboveLastMonth ? 'text-green-500' : ''}`}>
                  {trends ? formatMinutes(trends.projectedTotal) : '0m'}
                </p>
                <p className={`text-[10px] sm:text-xs ${trends && trends.paceAboveLastMonth ? 'text-green-500' : 'text-muted-foreground'}`}>
                  This Month (Pace)
                </p>
              </div>
              <div className="flex flex-col items-center text-center">
                <p className="text-sm sm:text-lg font-bold whitespace-nowrap">{formatMinutes(stats.lastMonthTotal)}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Last Month</p>
              </div>
            </div>
          </div>

          {/* Streaks */}
          <div className="rounded-lg bg-muted/50 p-2 sm:p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Flame className="w-4 h-4 text-primary" />
              <span className="text-xs sm:text-sm font-medium text-muted-foreground tracking-wide">Consistency</span>
            </div>
            <div className="space-y-2">
              <div className="flex flex-col items-center text-center">
                <p className="text-sm sm:text-lg font-bold whitespace-nowrap">{stats.currentStreak}d</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Current Streak</p>
              </div>
              <div className="flex flex-col items-center text-center">
                <p className="text-sm sm:text-lg font-bold whitespace-nowrap">{stats.bestDailyStreak}d</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Best Streak</p>
              </div>
            </div>
          </div>

          {/* Volume */}
          <div className="rounded-lg bg-muted/50 p-2 sm:p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="w-4 h-4 scale-125 origin-center">
                <g transform="translate(6, 4)">
                  <ellipse cx="4.5" cy="21" rx="3.5" ry="2.8" fill="#0599d5" transform="rotate(-15, 4.5, 21)"/>
                  <ellipse cx="15.5" cy="19" rx="3.5" ry="2.8" fill="#0599d5" transform="rotate(-15, 15.5, 19)"/>
                  <rect x="7" y="5" width="1.8" height="16.5" rx="0.9" fill="#0599d5"/>
                  <rect x="18" y="3" width="1.8" height="16.5" rx="0.9" fill="#0599d5"/>
                  <rect x="7" y="3" width="12.8" height="2.2" rx="1" fill="#0599d5"/>
                  <rect x="7" y="7" width="12.8" height="2.2" rx="1" fill="#0599d5"/>
                </g>
              </svg>
              <span className="text-xs sm:text-sm font-medium text-muted-foreground tracking-wide">Volume</span>
            </div>
            <div className="space-y-2">
              <div className="flex flex-col items-center text-center">
                <p className="text-sm sm:text-lg font-bold whitespace-nowrap">{stats.notesLast30Days ?? 'TBD'}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Notes (Last 30 Days)</p>
              </div>
              <div className="flex flex-col items-center text-center">
                <p className="text-sm sm:text-lg font-bold whitespace-nowrap">{stats.totalNotesCount}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Notes (All Time)</p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
