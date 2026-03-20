import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { usePracticeStats } from '@/hooks/usePracticeStats';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, Flame, Trophy, CalendarDays, Calendar, BarChart3, Share, Zap, ListTodo } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarHeatmap } from './CalendarHeatmap';
import { ShareCalendarSheet } from './ShareCalendarSheet';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';

interface PracticeStatsProps {
  profileId: string;
}

export function PracticeStats({ profileId }: PracticeStatsProps) {
  const { profile } = useAuth();
  const isMobile = useIsMobile();
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

  // Fetch routine frequency: notes linked to focus entries, grouped by title
  const { data: routineFrequency } = useQuery({
    queryKey: ['routine-frequency', profileId],
    queryFn: async () => {
      // Get all daily_focus entries with titles
      const { data: focusEntries, error: fErr } = await supabase
        .from('daily_focus')
        .select('id, focus_title')
        .eq('user_id', profileId);
      if (fErr) throw fErr;
      if (!focusEntries?.length) return [];

      // Get all notes linked to focus entries
      const { data: notes, error: nErr } = await supabase
        .from('notes')
        .select('focus_entry_id')
        .eq('author_id', profileId)
        .not('focus_entry_id', 'is', null);
      if (nErr) throw nErr;
      if (!notes?.length) return [];

      // Build a map: focus_entry_id -> title
      const titleMap = new Map<string, string>();
      focusEntries.forEach(e => {
        if (e.focus_title) titleMap.set(e.id, e.focus_title);
      });

      // Count notes per title
      const counts = new Map<string, number>();
      notes.forEach(n => {
        const title = titleMap.get(n.focus_entry_id!);
        if (title) {
          counts.set(title, (counts.get(title) || 0) + 1);
        }
      });

      return Array.from(counts.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
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
          const rawData = (stats.weeklyMinutesOverTime || []).map(d => ({
            ...d,
            hours: Math.round((d.minutes / 60) * 100) / 100,
          }));
          // Compute cumulative all-time average at each week
          const chartData = rawData.map((d, i) => {
            const sum = rawData.slice(0, i + 1).reduce((s, x) => s + x.hours, 0);
            return { ...d, avgHours: Math.round((sum / (i + 1)) * 100) / 100 };
          });
          const maxHours = Math.max(
            ...chartData.map(d => Math.max(d.hours, d.avgHours)),
            1
          );

          // For axis ticks: compact "0h", "2h", "4h"
          const formatAxisHours = (h: number) => {
            const hrs = Math.floor(h);
            const mins = Math.round((h - hrs) * 60);
            if (mins > 0) return `${hrs}h ${mins}m`;
            return `${hrs}h`;
          };

          // For tooltips: friendly "1h 20m" or "45m"
          const formatFriendlyHours = (h: number) => {
            const hrs = Math.floor(h);
            const mins = Math.round((h - hrs) * 60);
            if (hrs === 0 && mins === 0) return '0m';
            if (hrs === 0) return `${mins}m`;
            if (mins === 0) return `${hrs}h`;
            return `${hrs}h ${mins}m`;
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
              {/* Legend */}
              <div className="flex items-center gap-4 mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-0.5 rounded-full bg-primary" />
                  <span className="text-[10px] text-muted-foreground">Weekly Total</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <svg width="12" height="4" className="inline-block">
                    <line x1="0" y1="2" x2="12" y2="2" stroke="hsl(270 60% 65%)" strokeWidth="1.5" strokeDasharray="3 2" />
                  </svg>
                  <span className="text-[10px] text-muted-foreground">All Time Avg</span>
                </div>
              </div>
              <div className="h-40 mb-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                     <XAxis 
                      dataKey="week" 
                      tick={{ fontSize: 10 }} 
                      className="text-muted-foreground"
                      tickLine={false}
                      interval={isMobile ? 1 : 0}
                    />
                    <YAxis 
                      tick={{ fontSize: 10 }} 
                      className="text-muted-foreground"
                      tickLine={false}
                      width={40}
                      tickFormatter={formatAxisHours}
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
                        if (name === 'hours') return [formatFriendlyHours(value), 'Weekly total'];
                        if (name === 'avgHours') return [formatFriendlyHours(value), 'All time avg'];
                        return [formatFriendlyHours(value), name];
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="avgHours" 
                      stroke="hsl(270 60% 65%)" 
                      strokeWidth={1.5}
                      strokeDasharray="6 3"
                      dot={false}
                      activeDot={{ r: 3 }}
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
          {/* Monthly Minutes Practiced — top left */}
          <div className="rounded-lg bg-muted/50 p-2 sm:p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="text-xs sm:text-sm font-medium text-muted-foreground tracking-wide">Monthly Time</span>
            </div>
            <div className="space-y-2">
              <div className="flex flex-col items-center text-center">
                <p className={`text-sm sm:text-lg font-bold whitespace-nowrap ${trends ? (trends.paceAboveLastMonth ? 'text-green-500' : 'text-red-500') : ''}`}>
                  {trends ? formatMinutes(trends.projectedTotal) : '0m'}
                </p>
                <p className={`text-[10px] sm:text-xs ${trends ? (trends.paceAboveLastMonth ? 'text-green-500' : 'text-red-500') : 'text-muted-foreground'}`}>
                  This Month (Pace)
                </p>
              </div>
              <div className="flex flex-col items-center text-center">
                <p className="text-sm sm:text-lg font-bold whitespace-nowrap">{formatMinutes(stats.lastMonthTotal)}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Last Month</p>
              </div>
            </div>
          </div>

          {/* Streaks — top right */}
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

          {/* Monthly Volume — bottom left */}
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
              <span className="text-xs sm:text-sm font-medium text-muted-foreground tracking-wide">Monthly Volume</span>
            </div>
            <div className="space-y-2">
              {(() => {
                const now = new Date();
                const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                const daysPassed = Math.ceil((now.getTime() - monthStart.getTime()) / (1000 * 60 * 60 * 24)) || 1;
                const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
                const daysPracticed = Object.keys(stats.dailyMinutesMap).filter(d => {
                  const year = parseInt(d.slice(0, 4));
                  const month = parseInt(d.slice(5, 7));
                  return year === now.getFullYear() && month === now.getMonth() + 1 && stats.dailyMinutesMap[d] > 0;
                }).length;
                const pct = daysPassed > 0 ? Math.round((daysPracticed / daysPassed) * 100) : 0;
                return (
                  <>
                    <div className="flex flex-col items-center text-center">
                      <p className="text-sm sm:text-lg font-bold whitespace-nowrap">{daysPracticed}d</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Days this Month</p>
                    </div>
                    <div className="flex flex-col items-center text-center">
                      <p className={`text-sm sm:text-lg font-bold whitespace-nowrap ${pct > 70 ? 'text-green-500' : pct >= 50 ? 'text-yellow-500' : 'text-red-500'}`}>{pct}%</p>
                      <p className={`text-[10px] sm:text-xs ${pct > 70 ? 'text-green-500/70' : pct >= 50 ? 'text-yellow-500/70' : 'text-red-500/70'}`}>of Days this Month</p>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>

          {/* Yearly Volume — bottom right */}
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
              <span className="text-xs sm:text-sm font-medium text-muted-foreground tracking-wide">Yearly Volume</span>
            </div>
            <div className="space-y-2">
              {(() => {
                const now = new Date();
                const yearStart = new Date(now.getFullYear(), 0, 1);
                const daysPassed = Math.ceil((now.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24));
                const daysPracticed = Object.keys(stats.dailyMinutesMap).filter(d => {
                  const year = parseInt(d.slice(0, 4));
                  return year === now.getFullYear() && stats.dailyMinutesMap[d] > 0;
                }).length;
                const pct = daysPassed > 0 ? Math.round((daysPracticed / daysPassed) * 100) : 0;
                return (
                  <>
                    <div className="flex flex-col items-center text-center">
                      <p className="text-sm sm:text-lg font-bold whitespace-nowrap">{daysPracticed}d</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Days this Year</p>
                    </div>
                    <div className="flex flex-col items-center text-center">
                      <p className={`text-sm sm:text-lg font-bold whitespace-nowrap ${pct > 70 ? 'text-green-500' : pct >= 50 ? 'text-yellow-500' : 'text-red-500'}`}>{pct}%</p>
                      <p className={`text-[10px] sm:text-xs ${pct > 70 ? 'text-green-500/70' : pct >= 50 ? 'text-yellow-500/70' : 'text-red-500/70'}`}>of Days this Year</p>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      </Card>

      {/* Section: Routine Frequency — hidden when no data */}
      {routineFrequency && routineFrequency.length > 0 && (
        <Card className="p-4 bg-card border-border">
          <div className="flex items-center gap-2 mb-1">
            <ListTodo className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Routine Frequency</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-3">Notes logged per routine</p>
          <div style={{ height: Math.max(120, routineFrequency.length * 36 + 24) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={routineFrequency} layout="vertical" margin={{ left: 4, right: 16, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 10 }}
                  className="text-muted-foreground"
                  tickLine={false}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  className="text-muted-foreground"
                  tickLine={false}
                  width={isMobile ? 80 : 120}
                  interval={0}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                  formatter={(value: number) => [`${value} note${value !== 1 ? 's' : ''}`, 'Practiced']}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={24}>
                  {routineFrequency.map((_, index) => (
                    <Cell key={index} fill={`hsl(var(--primary) / ${0.5 + (0.5 * (1 - index / Math.max(routineFrequency.length - 1, 1)))})`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Section: Focus Level Chart — hidden when no data */}
      {stats.weeklyFocusAverage.some(w => w.average > 0) && (
        <Card className="p-4 bg-card border-border">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Focus Level</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-3">Average weekly session focus level</p>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.weeklyFocusAverage}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 10 }}
                  className="text-muted-foreground"
                  tickLine={false}
                  interval={isMobile ? 1 : 0}
                />
                <YAxis
                  domain={[0, 5]}
                  ticks={[1, 2, 3, 4, 5]}
                  tick={{ fontSize: 10 }}
                  className="text-muted-foreground"
                  tickLine={false}
                  width={24}
                  interval={0}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                  formatter={(value: number) => [value > 0 ? value.toFixed(1) : '—', 'Avg Focus']}
                />
                <Line
                  type="monotone"
                  dataKey="average"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 3 }}
                  activeDot={{ r: 5 }}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
    </div>
  );
}
