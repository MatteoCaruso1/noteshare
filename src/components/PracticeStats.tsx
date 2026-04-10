import { useMemo, useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { usePracticeStats } from '@/hooks/usePracticeStats';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, Flame, Trophy, CalendarDays, Calendar, BarChart3, Share, Zap, ListTodo } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RichTextContent } from '@/components/RichTextContent';
import { CalendarHeatmap } from './CalendarHeatmap';
import { CustomChartBuilder } from './CustomChartBuilder';
import { ShareCalendarSheet } from './ShareCalendarSheet';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';

type TimeRange = '1m' | '2m' | '3m' | '6m' | 'all';
const TIME_RANGE_OPTIONS: { value: TimeRange; label: string }[] = [
  { value: '1m', label: '1M' },
  { value: '2m', label: '2M' },
  { value: '3m', label: '3M' },
  { value: '6m', label: '6M' },
  { value: 'all', label: 'All' },
];
const WEEKS_FOR_RANGE: Record<TimeRange, number> = { '1m': 5, '2m': 9, '3m': 13, '6m': 26, 'all': 52 };

function RangePill({ label, isActive, onClick }: { label: string; isActive: boolean; onClick: () => void }) {
  const handleInteractionEnd = (e: React.TouchEvent | React.PointerEvent) => {
    (e.currentTarget as HTMLButtonElement).blur();
  };
  return (
    <button
      type="button"
      aria-pressed={isActive}
      data-no-hover-reset
      onClick={onClick}
      onTouchEnd={handleInteractionEnd}
      onPointerUp={handleInteractionEnd}
      className={`px-2 py-0.5 text-[11px] font-medium rounded-full touch-manipulation select-none [-webkit-tap-highlight-color:transparent] transition-colors ${
        isActive
          ? 'bg-primary text-primary-foreground active:bg-primary active:text-primary-foreground'
          : 'bg-muted text-muted-foreground active:bg-muted active:text-muted-foreground [@media(hover:hover)]:hover:bg-muted/80'
      }`}
    >
      {label}
    </button>
  );
}

interface PracticeStatsProps {
  profileId: string;
}

export function PracticeStats({ profileId }: PracticeStatsProps) {
  const { profile } = useAuth();
  const isMobile = useIsMobile();
  const { data: stats, isLoading, error, isFetching } = usePracticeStats(profileId);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [showShareCalendar, setShowShareCalendar] = useState(false);
  const [chartRange, setChartRange] = useState<TimeRange>(() => {
    const saved = localStorage.getItem('practiceStats_chartRange');
    return (saved && ['1m', '2m', '3m', '6m', 'all'].includes(saved)) ? saved as TimeRange : '1m';
  });
  const [focusRange, setFocusRange] = useState<TimeRange>(() => {
    const saved = localStorage.getItem('practiceStats_focusRange');
    return (saved && ['1m', '2m', '3m', '6m', 'all'].includes(saved)) ? saved as TimeRange : '1m';
  });

  const handleSetChartRange = (range: TimeRange) => {
    setChartRange(range);
    localStorage.setItem('practiceStats_chartRange', range);
  };
  const handleSetFocusRange = (range: TimeRange) => {
    setFocusRange(range);
    localStorage.setItem('practiceStats_focusRange', range);
  };

  // Slice chart data based on selected time range
  const weeksToShow = WEEKS_FOR_RANGE[chartRange];
  const focusWeeksToShow = WEEKS_FOR_RANGE[focusRange];
  const filteredWeeklyData = useMemo(() => {
    const all = stats?.weeklyMinutesOverTime || [];
    // Find first week with any activity
    const firstActiveIdx = all.findIndex(w => w.minutes > 0);
    const trimmed = firstActiveIdx >= 0 ? all.slice(firstActiveIdx) : all;
    return trimmed.slice(-weeksToShow);
  }, [stats?.weeklyMinutesOverTime, weeksToShow]);
  const filteredFocusData = useMemo(() => {
    const all = stats?.weeklyFocusAverage || [];
    const firstActiveIdx = all.findIndex(w => w.average > 0);
    const trimmed = firstActiveIdx >= 0 ? all.slice(firstActiveIdx) : all;
    return trimmed.slice(-focusWeeksToShow);
  }, [stats?.weeklyFocusAverage, focusWeeksToShow]);

  // Smart x-axis tick interval: prevent label overlap
  const xAxisInterval = useMemo(() => {
    if (isMobile) {
      if (weeksToShow <= 5) return 0;
      if (weeksToShow <= 9) return 1;
      if (weeksToShow <= 13) return 2;
      if (weeksToShow <= 26) return 3;
      return 7;
    }
    if (weeksToShow <= 9) return 0;
    if (weeksToShow <= 13) return 1;
    if (weeksToShow <= 26) return 2;
    return 5;
  }, [weeksToShow, isMobile]);

  const focusXAxisInterval = useMemo(() => {
    if (isMobile) {
      if (focusWeeksToShow <= 5) return 0;
      if (focusWeeksToShow <= 9) return 1;
      if (focusWeeksToShow <= 13) return 2;
      if (focusWeeksToShow <= 26) return 3;
      return 7;
    }
    if (focusWeeksToShow <= 9) return 0;
    if (focusWeeksToShow <= 13) return 1;
    if (focusWeeksToShow <= 26) return 2;
    return 5;
  }, [focusWeeksToShow, isMobile]);

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
      // Get all daily_focus entries with titles and text
      const { data: focusEntries, error: fErr } = await supabase
        .from('daily_focus')
        .select('id, focus_title, focus_text')
        .eq('user_id', profileId);
      if (fErr) throw fErr;
      if (!focusEntries?.length) return [];

      // Get all notes linked to focus entries (include session_id for minutes lookup)
      const { data: notes, error: nErr } = await supabase
        .from('notes')
        .select('focus_entry_id, session_id')
        .eq('author_id', profileId)
        .not('focus_entry_id', 'is', null);
      if (nErr) throw nErr;
      if (!notes?.length) return [];

      // Get practice sessions for minutes calculation (linked via notes' session_id)
      const sessionIds = [...new Set(notes.map(n => n.session_id).filter(Boolean))] as string[];
      let sessions: { id: string; started_at: string; ended_at: string | null; paused_duration_ms: number | null }[] = [];
      if (sessionIds.length > 0) {
        const { data: sData, error: sErr } = await supabase
          .from('practice_sessions')
          .select('id, started_at, ended_at, paused_duration_ms')
          .in('id', sessionIds)
          .not('ended_at', 'is', null);
        if (sErr) throw sErr;
        sessions = sData || [];
      }

      // Build maps: focus_entry_id -> title, focus_entry_id -> text
      const titleMap = new Map<string, string>();
      const textMap = new Map<string, string>();
      focusEntries.forEach(e => {
        if (e.focus_title) {
          titleMap.set(e.id, e.focus_title);
          if (e.focus_text) textMap.set(e.focus_title, e.focus_text);
        }
      });

      // Count notes per title
      const noteCounts = new Map<string, number>();
      notes.forEach(n => {
        const title = titleMap.get(n.focus_entry_id!);
        if (title) {
          noteCounts.set(title, (noteCounts.get(title) || 0) + 1);
        }
      });

      // Sum minutes per title (link through notes: note.focus_entry_id → title, note.session_id → session)
      const sessionMap = new Map<string, { started_at: string; ended_at: string; paused_duration_ms: number | null }>();
      sessions.forEach(s => sessionMap.set(s.id, s));

      const minuteCounts = new Map<string, number>();
      const countedSessions = new Set<string>(); // avoid double-counting same session
      notes.forEach(n => {
        const title = titleMap.get(n.focus_entry_id!);
        if (title && n.session_id && !countedSessions.has(n.session_id)) {
          const s = sessionMap.get(n.session_id);
          if (s) {
            countedSessions.add(n.session_id);
            const durationMs = new Date(s.ended_at).getTime() - new Date(s.started_at).getTime() - (s.paused_duration_ms || 0);
            const minutes = Math.max(0, Math.round(durationMs / 60000));
            minuteCounts.set(title, (minuteCounts.get(title) || 0) + minutes);
          }
        }
      });

      return Array.from(noteCounts.entries())
        .map(([name, count]) => ({
          name,
          count,
          minutes: minuteCounts.get(name) || 0,
          routineText: textMap.get(name) || '',
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    },
    enabled: !!profileId,
    staleTime: 5 * 60 * 1000,
  });

  // State for routine preview
  const [previewRoutine, setPreviewRoutine] = useState<{ name: string; routineText: string; count: number; minutes: number } | null>(null);

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
      {/* Section: Progress */}
      <Card className="p-4 bg-card border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Practice Time</h3>
          </div>
          <div className="flex gap-1">
            {TIME_RANGE_OPTIONS.map(opt => (
              <RangePill
                key={opt.value}
                label={opt.label}
                isActive={chartRange === opt.value}
                onClick={() => handleSetChartRange(opt.value)}
              />
            ))}
          </div>
        </div>
        
        {/* Line Chart */}
        {(() => {
          const rawData = filteredWeeklyData.map(d => ({
            ...d,
            hours: Math.round((d.minutes / 60) * 100) / 100,
          }));
          // Compute running cumulative average up to each week
          const allWeeks = stats?.weeklyMinutesOverTime || [];
          const runningAvgMap = new Map<string, number>();
          let cumSum = 0;
          let cumCount = 0;
          for (const w of allWeeks) {
            if (w.minutes > 0) {
              cumSum += w.minutes;
              cumCount++;
            }
            runningAvgMap.set(w.week, cumCount > 0 ? Math.round((cumSum / cumCount / 60) * 100) / 100 : 0);
          }
          // Compute 4-week rolling average
          const fourWeekAvgMap = new Map<string, number>();
          for (let i = 0; i < allWeeks.length; i++) {
            const window = allWeeks.slice(Math.max(0, i - 3), i + 1);
            const windowSum = window.reduce((s, w) => s + w.minutes, 0);
            fourWeekAvgMap.set(allWeeks[i].week, Math.round((windowSum / window.length / 60) * 100) / 100);
          }
          const chartData = rawData.map(d => ({
            ...d,
            avgHours: runningAvgMap.get(d.week) ?? 0,
            fourWeekAvg: fourWeekAvgMap.get(d.week) ?? 0,
          }));
          const maxHours = Math.max(
            ...chartData.map(d => Math.max(d.hours, d.avgHours, d.fourWeekAvg)),
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
                <div className="flex items-center gap-1.5">
                  <svg width="12" height="4" className="inline-block">
                    <line x1="0" y1="2" x2="12" y2="2" stroke="hsl(38 92% 50%)" strokeWidth="1.5" strokeDasharray="4 2" />
                  </svg>
                  <span className="text-[10px] text-muted-foreground">4-Week Avg</span>
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
                      interval={xAxisInterval}
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
                        if (name === 'fourWeekAvg') return [formatFriendlyHours(value), '4-week avg'];
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
                      dataKey="fourWeekAvg" 
                      stroke="hsl(38 92% 50%)" 
                      strokeWidth={1.5}
                      strokeDasharray="4 2"
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
                <p className={`text-sm sm:text-lg font-bold whitespace-nowrap ${stats.currentStreak >= 1 ? 'text-green-500' : ''}`}>{stats.currentStreak}d</p>
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
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="w-4 h-4 scale-125 origin-center text-primary">
                <g transform="translate(6, 4)">
                  <ellipse cx="4.5" cy="21" rx="3.5" ry="2.8" fill="currentColor" transform="rotate(-15, 4.5, 21)"/>
                  <ellipse cx="15.5" cy="19" rx="3.5" ry="2.8" fill="currentColor" transform="rotate(-15, 15.5, 19)"/>
                  <rect x="7" y="5" width="1.8" height="16.5" rx="0.9" fill="currentColor"/>
                  <rect x="18" y="3" width="1.8" height="16.5" rx="0.9" fill="currentColor"/>
                  <rect x="7" y="3" width="12.8" height="2.2" rx="1" fill="currentColor"/>
                  <rect x="7" y="7" width="12.8" height="2.2" rx="1" fill="currentColor"/>
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
                      <p className="text-sm sm:text-lg font-bold whitespace-nowrap">{daysPracticed}/{daysPassed}d</p>
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
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className="w-4 h-4 scale-125 origin-center text-primary">
                <g transform="translate(6, 4)">
                  <ellipse cx="4.5" cy="21" rx="3.5" ry="2.8" fill="currentColor" transform="rotate(-15, 4.5, 21)"/>
                  <ellipse cx="15.5" cy="19" rx="3.5" ry="2.8" fill="currentColor" transform="rotate(-15, 15.5, 19)"/>
                  <rect x="7" y="5" width="1.8" height="16.5" rx="0.9" fill="currentColor"/>
                  <rect x="18" y="3" width="1.8" height="16.5" rx="0.9" fill="currentColor"/>
                  <rect x="7" y="3" width="12.8" height="2.2" rx="1" fill="currentColor"/>
                  <rect x="7" y="7" width="12.8" height="2.2" rx="1" fill="currentColor"/>
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
                      <p className="text-sm sm:text-lg font-bold whitespace-nowrap">{daysPracticed}/{daysPassed}d</p>
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
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))'
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))' }}
                  itemStyle={{ color: 'hsl(var(--foreground))' }}
                  formatter={(value: number, _name: string, props: any) => {
                    const entry = props?.payload;
                    const mins = entry?.minutes || 0;
                    return [`${value} note${value !== 1 ? 's' : ''}, ${mins} min${mins !== 1 ? 's' : ''}`, ''];
                  }}
                />
                <Bar
                  dataKey="count"
                  radius={[0, 4, 4, 0]}
                  maxBarSize={24}
                  cursor="pointer"
                  onClick={(data: any) => {
                    if (data?.routineText) {
                      setPreviewRoutine(data);
                    }
                  }}
                >
                  {routineFrequency.map((_, index) => (
                    <Cell key={index} fill={`hsl(var(--primary) / ${0.5 + (0.5 * (1 - index / Math.max(routineFrequency.length - 1, 1)))})`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Routine Preview Dialog */}
      <Dialog open={!!previewRoutine} onOpenChange={(open) => !open && setPreviewRoutine(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ListTodo className="w-5 h-5 text-primary" />
              {previewRoutine?.name}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              {previewRoutine?.count} note{previewRoutine?.count !== 1 ? 's' : ''}, {previewRoutine?.minutes} min{previewRoutine?.minutes !== 1 ? 's' : ''}
            </p>
          </DialogHeader>
          <ScrollArea className="max-h-[50vh]">
            <div className="text-sm whitespace-pre-wrap text-foreground">
              <RichTextContent content={previewRoutine?.routineText || ''} />
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Section: Custom Charts */}
      <CustomChartBuilder profileId={profileId} stats={stats} />
    </div>
  );
}
