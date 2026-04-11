import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { Plus, Save, Trash2, BarChart3, LineChartIcon, X, ChevronDown, Check, PieChartIcon, Gauge, BarChart2, Pencil, ChevronLeft, ChevronRight, Settings2, Eye, EyeOff } from 'lucide-react';
import { useCustomChartViews, type CustomChartView } from '@/hooks/useCustomChartViews';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import { format, startOfWeek, startOfMonth, subWeeks, subMonths, endOfWeek, endOfMonth, isWithinInterval, parseISO, subDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

// --- Metric definitions ---
interface MetricDef {
  key: string;
  label: string;
  shortLabel: string;
  unit: string;
  category: string;
  granularities: ('weekly' | 'monthly')[];
  chartTypes: ChartType[];
}

type ChartType = 'line' | 'bar' | 'histogram' | 'gauge' | 'donut';

const METRICS: MetricDef[] = [
  // Time
  { key: 'practice_hours', label: 'Hours Practiced', shortLabel: 'Hours', unit: 'hrs', category: 'Time', granularities: ['weekly', 'monthly'], chartTypes: ['line', 'bar'] },
  { key: 'avg_session_length', label: 'Avg Session Length', shortLabel: 'Avg Length', unit: 'min', category: 'Time', granularities: ['weekly', 'monthly'], chartTypes: ['line', 'bar'] },
  { key: 'longest_session', label: 'Longest Session', shortLabel: 'Max Session', unit: 'min', category: 'Time', granularities: ['weekly', 'monthly'], chartTypes: ['line', 'bar'] },
  { key: 'cumulative_hours', label: 'Cumulative Hours', shortLabel: 'Total Hrs', unit: 'hrs', category: 'Milestones', granularities: ['weekly', 'monthly'], chartTypes: ['line', 'bar'] },
  // Consistency
  { key: 'pct_days_practiced', label: '% Days Practiced', shortLabel: '% Days', unit: '%', category: 'Consistency', granularities: ['weekly', 'monthly'], chartTypes: ['line', 'bar'] },
  { key: 'days_practiced', label: 'Days Practiced', shortLabel: 'Days', unit: 'days', category: 'Consistency', granularities: ['weekly', 'monthly'], chartTypes: ['line', 'bar'] },
  { key: 'streak_history', label: 'Streak History', shortLabel: 'Streak', unit: 'days', category: 'Consistency', granularities: ['weekly', 'monthly'], chartTypes: ['line', 'bar'] },
  // Quality
  { key: 'focus_level', label: 'Avg Focus Level', shortLabel: 'Focus', unit: '/5', category: 'Quality', granularities: ['weekly', 'monthly'], chartTypes: ['line', 'bar'] },
  { key: 'practice_per_day', label: 'Avg Time Per Day Practiced', shortLabel: 'Min/Day', unit: 'min', category: 'Efficiency', granularities: ['weekly', 'monthly'], chartTypes: ['line', 'bar'] },
  // Histogram metrics
  { key: 'session_duration_dist', label: 'Session Duration Distribution', shortLabel: 'Duration Dist', unit: '', category: 'Distribution', granularities: ['weekly', 'monthly'], chartTypes: ['histogram'] },
  // Gauge metrics
  { key: 'weekly_goal_progress', label: 'Weekly Goal Progress', shortLabel: 'Goal', unit: '%', category: 'Goals', granularities: ['weekly'], chartTypes: ['gauge'] },
  // Donut metrics
  { key: 'routine_distribution', label: 'Practice by Routine', shortLabel: 'Routines', unit: '', category: 'Distribution', granularities: ['weekly', 'monthly'], chartTypes: ['donut'] },
  { key: 'focus_distribution', label: 'Focus Level Distribution', shortLabel: 'Focus Dist', unit: '', category: 'Distribution', granularities: ['weekly', 'monthly'], chartTypes: ['donut'] },
];

const TIME_RANGES = [
  { value: '1m', label: '1 Month', weeks: 5, months: 1 },
  { value: '3m', label: '3 Months', weeks: 13, months: 3 },
  { value: '6m', label: '6 Months', weeks: 26, months: 6 },
  { value: '1y', label: '1 Year', weeks: 52, months: 12 },
];

const CHART_TYPES: { value: ChartType; label: string; icon: any }[] = [
  { value: 'line', label: 'Line', icon: LineChartIcon },
  { value: 'bar', label: 'Bar', icon: BarChart3 },
  { value: 'histogram', label: 'Histogram', icon: BarChart2 },
  { value: 'gauge', label: 'Gauge', icon: Gauge },
  { value: 'donut', label: 'Donut', icon: PieChartIcon },
];

const DONUT_COLORS = [
  'hsl(var(--primary))',
  'hsl(38, 92%, 50%)',
  'hsl(150, 60%, 45%)',
  'hsl(280, 60%, 55%)',
  'hsl(10, 80%, 55%)',
  'hsl(200, 70%, 50%)',
  'hsl(50, 85%, 50%)',
  'hsl(320, 60%, 50%)',
];

interface ChartConfig {
  chart_type: ChartType;
  metric: string;
  compare_metric?: string;
  time_granularity: 'weekly' | 'monthly';
  time_range: string;
}

interface CustomChartBuilderProps {
  profileId: string;
  stats: {
    weeklyMinutesOverTime: { week: string; minutes: number }[];
    weeklyDaysPracticed: { week: string; days: number }[];
    dailyMinutesMap: Record<string, number>;
    weeklyFocusAverage: { week: string; average: number }[];
    totalNotesCount: number;
    topTagsThisMonth: { tag: string; count: number }[];
  };
  onRoutineClick?: (routine: { name: string; routineText: string; count: number; minutes: number }) => void;
}

// Parse "MMM d" week label back to approximate date
function parseWeekLabel(label: string, referenceDate: Date): Date | null {
  try {
    const year = referenceDate.getFullYear();
    const parsed = new Date(`${label} ${year}`);
    if (!isNaN(parsed.getTime())) return parsed;
    const parsed2 = new Date(`${label} ${year - 1}`);
    if (!isNaN(parsed2.getTime())) return parsed2;
  } catch { }
  return null;
}

// Compute streak at end of each period from dailyMinutesMap
function computeStreakHistory(dailyMinutesMap: Record<string, number>, numDays: number): Record<string, number> {
  const now = new Date();
  const streakByDate: Record<string, number> = {};
  let streak = 0;
  
  // Go back far enough to compute streak correctly
  const lookback = numDays + 365;
  for (let i = lookback; i >= 0; i--) {
    const d = subDays(now, i);
    const dayStr = format(d, 'yyyy-MM-dd');
    if ((dailyMinutesMap[dayStr] || 0) > 0) {
      streak++;
    } else {
      streak = 0;
    }
    if (i <= numDays) {
      streakByDate[dayStr] = streak;
    }
  }
  return streakByDate;
}

// Compute chart data from stats based on config
function useChartData(
  config: ChartConfig,
  stats: CustomChartBuilderProps['stats'],
  routineData?: { focus_title_snapshot: string | null }[],
) {
  return useMemo(() => {
    const now = new Date();
    const rangeInfo = TIME_RANGES.find(r => r.value === config.time_range) || TIME_RANGES[1];

    // Special chart types that don't use time series
    if (config.chart_type === 'histogram') {
      return computeHistogramData(config, stats, rangeInfo);
    }
    if (config.chart_type === 'donut') {
      return computeDonutData(config, stats, rangeInfo, routineData);
    }
    if (config.chart_type === 'gauge') {
      return []; // gauge handled separately
    }

    // Streak history needs special computation
    const streakByDate = config.metric === 'streak_history'
      ? computeStreakHistory(stats.dailyMinutesMap, rangeInfo.weeks * 7)
      : {};

    if (config.time_granularity === 'weekly') {
      const numWeeks = rangeInfo.weeks;
      const data: { label: string; value: number }[] = [];
      let cumulative = 0;

      if (config.metric === 'cumulative_hours') {
        const allWeeks = stats.weeklyMinutesOverTime;
        for (let i = 0; i < allWeeks.length - numWeeks; i++) {
          cumulative += allWeeks[i].minutes;
        }
      }

      for (let i = numWeeks - 1; i >= 0; i--) {
        const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
        const weekEnd = endOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
        const weekLabel = format(weekStart, 'MMM d');

        const weekData = stats.weeklyMinutesOverTime.find(w => w.week === weekLabel);
        const weekMinutes = weekData?.minutes || 0;
        const weekDays = stats.weeklyDaysPracticed.find(w => w.week === weekLabel)?.days || 0;
        const focusData = stats.weeklyFocusAverage.find(w => w.week === weekLabel);

        let sessionCount = 0;
        let longestDay = 0;
        let totalDaysWithActivity = 0;
        for (let d = 0; d < 7; d++) {
          const day = new Date(weekStart);
          day.setDate(day.getDate() + d);
          const dayStr = format(day, 'yyyy-MM-dd');
          const dayMins = stats.dailyMinutesMap[dayStr] || 0;
          if (dayMins > 0) {
            sessionCount++;
            totalDaysWithActivity++;
            if (dayMins > longestDay) longestDay = dayMins;
          }
        }

        let value = 0;
        switch (config.metric) {
          case 'practice_hours': value = Math.round((weekMinutes / 60) * 100) / 100; break;
          case 'avg_session_length': value = sessionCount > 0 ? Math.round(weekMinutes / sessionCount) : 0; break;
          case 'days_practiced': value = weekDays || totalDaysWithActivity; break;
          case 'pct_days_practiced': value = Math.round(((weekDays || totalDaysWithActivity) / 7) * 100); break;
          case 'focus_level': value = focusData?.average || 0; break;
          case 'longest_session': value = longestDay; break;
          case 'practice_per_day': value = totalDaysWithActivity > 0 ? Math.round(weekMinutes / totalDaysWithActivity) : 0; break;
          case 'cumulative_hours':
            cumulative += weekMinutes;
            value = Math.round((cumulative / 60) * 10) / 10;
            break;
          case 'streak_history': {
            // Get streak value at end of this week
            const endDay = format(weekEnd > now ? now : weekEnd, 'yyyy-MM-dd');
            value = streakByDate[endDay] || 0;
            break;
          }
        }

        data.push({ label: weekLabel, value });
      }

      return data;
    } else {
      // Monthly
      const numMonths = rangeInfo.months;
      const data: { label: string; value: number }[] = [];
      let cumulative = 0;

      if (config.metric === 'cumulative_hours') {
        const allWeeks = stats.weeklyMinutesOverTime;
        for (const w of allWeeks) {
          const wDate = parseWeekLabel(w.week, now);
          if (wDate && wDate < subMonths(now, numMonths)) {
            cumulative += w.minutes;
          }
        }
      }

      for (let i = numMonths - 1; i >= 0; i--) {
        const monthStart = startOfMonth(subMonths(now, i));
        const monthEnd = endOfMonth(subMonths(now, i));
        const monthLabel = format(monthStart, 'MMM yyyy');

        let monthMinutes = 0;
        let daysWithActivity = 0;
        let longestDay = 0;
        const daysInMonth = monthEnd.getDate();

        for (let d = 1; d <= daysInMonth; d++) {
          const dayStr = format(new Date(monthStart.getFullYear(), monthStart.getMonth(), d), 'yyyy-MM-dd');
          const dayMins = stats.dailyMinutesMap[dayStr] || 0;
          if (dayMins > 0) {
            monthMinutes += dayMins;
            daysWithActivity++;
            if (dayMins > longestDay) longestDay = dayMins;
          }
        }

        const focusValues: number[] = [];
        stats.weeklyFocusAverage.forEach(w => {
          const wDate = parseWeekLabel(w.week, now);
          if (wDate && w.average > 0 && isWithinInterval(wDate, { start: monthStart, end: monthEnd })) {
            focusValues.push(w.average);
          }
        });
        const avgFocus = focusValues.length > 0 ? Math.round((focusValues.reduce((s, v) => s + v, 0) / focusValues.length) * 10) / 10 : 0;

        let value = 0;
        switch (config.metric) {
          case 'practice_hours': value = Math.round((monthMinutes / 60) * 100) / 100; break;
          case 'avg_session_length': value = daysWithActivity > 0 ? Math.round(monthMinutes / daysWithActivity) : 0; break;
          case 'days_practiced': value = daysWithActivity; break;
          case 'pct_days_practiced': value = Math.round((daysWithActivity / daysInMonth) * 100); break;
          case 'focus_level': value = avgFocus; break;
          case 'longest_session': value = longestDay; break;
          case 'practice_per_day': value = daysWithActivity > 0 ? Math.round(monthMinutes / daysWithActivity) : 0; break;
          case 'cumulative_hours':
            cumulative += monthMinutes;
            value = Math.round((cumulative / 60) * 10) / 10;
            break;
          case 'streak_history': {
            const endDay = format(monthEnd > now ? now : monthEnd, 'yyyy-MM-dd');
            value = streakByDate[endDay] || 0;
            break;
          }
        }

        data.push({ label: monthLabel, value });
      }

      return data;
    }
  }, [config.metric, config.time_granularity, config.time_range, config.chart_type, stats, routineData]);
}

function computeHistogramData(
  config: ChartConfig,
  stats: CustomChartBuilderProps['stats'],
  rangeInfo: { weeks: number; months: number },
) {
  const now = new Date();
  // Gather per-day durations within range
  const durations: number[] = [];
  const daysBack = config.time_granularity === 'weekly' ? rangeInfo.weeks * 7 : rangeInfo.months * 31;
  
  for (let i = 0; i < daysBack; i++) {
    const dayStr = format(subDays(now, i), 'yyyy-MM-dd');
    const mins = stats.dailyMinutesMap[dayStr] || 0;
    if (mins > 0) durations.push(mins);
  }

  if (durations.length === 0) return [];

  // Create histogram buckets
  const buckets = [
    { label: '0-15m', min: 0, max: 15 },
    { label: '15-30m', min: 15, max: 30 },
    { label: '30-60m', min: 30, max: 60 },
    { label: '1-2h', min: 60, max: 120 },
    { label: '2-3h', min: 120, max: 180 },
    { label: '3h+', min: 180, max: Infinity },
  ];

  return buckets.map(b => ({
    label: b.label,
    value: durations.filter(d => d >= b.min && d < b.max).length,
  }));
}

function computeDonutData(
  config: ChartConfig,
  stats: CustomChartBuilderProps['stats'],
  rangeInfo: { weeks: number; months: number },
  routineData?: { focus_title_snapshot: string | null }[],
) {
  if (config.metric === 'routine_distribution') {
    if (!routineData || routineData.length === 0) return [];
    // Aggregate by routine name
    const counts: Record<string, number> = {};
    routineData.forEach(n => {
      const name = n.focus_title_snapshot || 'Untitled';
      counts[name] = (counts[name] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([label, value]) => ({ label, value }));
  }

  if (config.metric === 'focus_distribution') {
    // Distribution of focus levels from weeklyFocusAverage
    const counts: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
    const now = new Date();
    const daysBack = rangeInfo.weeks * 7;

    // We don't have per-note focus data easily, so bucket weekly averages
    const relevantWeeks = stats.weeklyFocusAverage.filter(w => {
      const wDate = parseWeekLabel(w.week, now);
      return wDate && w.average > 0 && wDate >= subDays(now, daysBack);
    });

    relevantWeeks.forEach(w => {
      const rounded = Math.round(w.average).toString();
      if (counts[rounded] !== undefined) counts[rounded]++;
    });

    const labels: Record<string, string> = { '1': 'Low (1)', '2': 'Fair (2)', '3': 'Mid (3)', '4': 'Good (4)', '5': 'Great (5)' };
    return Object.entries(counts)
      .filter(([_, v]) => v > 0)
      .map(([k, v]) => ({ label: labels[k], value: v }));
  }

  return [];
}

// ---- Selector components ----

function PillSelector({ options, value, onChange, className = '', disabledValues = [] }: {
  options: { value: string; label: string; icon?: any }[];
  value: string;
  onChange: (v: string) => void;
  className?: string;
  disabledValues?: string[];
}) {
  const handleInteractionEnd = (e: React.TouchEvent | React.PointerEvent) => {
    (e.currentTarget as HTMLButtonElement).blur();
  };
  return (
    <div className={`flex gap-1 flex-wrap ${className}`}>
      {options.map(opt => {
        const Icon = opt.icon;
        const isDisabled = disabledValues.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={value === opt.value}
            data-no-hover-reset
            onClick={() => !isDisabled && onChange(opt.value)}
            onTouchEnd={handleInteractionEnd}
            onPointerUp={handleInteractionEnd}
            disabled={isDisabled}
            className={`px-2.5 py-1 text-xs font-medium rounded-full touch-manipulation select-none [-webkit-tap-highlight-color:transparent] transition-colors flex items-center gap-1 ${
              isDisabled
                ? 'bg-muted/40 text-muted-foreground/40 cursor-not-allowed'
                : value === opt.value
                  ? 'bg-primary text-primary-foreground active:bg-primary active:text-primary-foreground'
                  : 'bg-muted text-muted-foreground active:bg-muted active:text-muted-foreground [@media(hover:hover)]:hover:bg-muted/80'
            }`}
          >
            {Icon && <Icon className="w-3 h-3" />}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function MetricSelector({ value, onChange, chartType, allowClear }: { value: string; onChange: (v: string) => void; chartType: ChartType; allowClear?: boolean }) {
  const [open, setOpen] = useState(false);
  const availableMetrics = METRICS.filter(m => m.chartTypes.includes(chartType));
  const selected = availableMetrics.find(m => m.key === value);
  const categories = [...new Set(availableMetrics.map(m => m.category))];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-muted text-sm text-foreground touch-manipulation"
      >
        <span>{selected?.label || 'Select metric'}</span>
        <div className="flex items-center gap-1">
          {allowClear && value && (
            <span
              role="button"
              onClick={(e) => { e.stopPropagation(); onChange(''); }}
              className="text-muted-foreground [@media(hover:hover)]:hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute z-50 mt-1 w-full bg-card border border-border rounded-lg shadow-lg max-h-64 overflow-y-auto">
            {categories.map(cat => (
              <div key={cat}>
                <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/50">
                  {cat}
                </div>
                {availableMetrics.filter(m => m.category === cat).map(m => (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => { onChange(m.key); setOpen(false); }}
                    className={`w-full text-left px-3 py-2 text-sm touch-manipulation flex items-center justify-between ${
                      value === m.key ? 'bg-primary/10 text-primary' : 'text-foreground [@media(hover:hover)]:hover:bg-muted/60'
                    }`}
                  >
                    <span>{m.label}</span>
                    {value === m.key && <Check className="w-4 h-4" />}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ---- Chart Renderers ----

function TimeSeriesRenderer({ config, data }: { config: ChartConfig; data: { label: string; value: number }[] }) {
  const isMobile = useIsMobile();
  const metricDef = METRICS.find(m => m.key === config.metric);
  const unit = metricDef?.unit || '';
  
  const dataLength = data.length;
  const xInterval = isMobile
    ? Math.max(0, Math.ceil(dataLength / 4) - 1)
    : Math.max(0, Math.ceil(dataLength / 8) - 1);

  const formatValue = (v: number) => {
    if (config.metric === 'focus_level') return v > 0 ? v.toFixed(1) : '—';
    if (config.metric === 'practice_hours' || config.metric === 'cumulative_hours') {
      return v < 1 ? `${Math.round(v * 60)}m` : `${v.toFixed(1)}h`;
    }
    if (config.metric === 'pct_days_practiced') return `${v}%`;
    return `${v}${unit ? ` ${unit}` : ''}`;
  };

  const tooltipFormatter = (value: number) => {
    return [formatValue(value), metricDef?.shortLabel || ''];
  };

  const tooltipStyle = {
    backgroundColor: 'hsl(var(--card))',
    borderColor: 'hsl(var(--border))',
    borderRadius: '8px',
  };

  if (config.chart_type === 'bar') {
    return (
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} className="text-muted-foreground" tickLine={false} interval={xInterval} />
            <YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" tickLine={false} width={42} label={unit ? { value: unit, angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: 'hsl(var(--muted-foreground))' }, offset: 0 } : undefined} />
            <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: 'hsl(var(--foreground))' }} formatter={tooltipFormatter} />
            <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="h-40">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} className="text-muted-foreground" tickLine={false} interval={xInterval} />
          <YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" tickLine={false} width={42} label={unit ? { value: unit, angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: 'hsl(var(--muted-foreground))' }, offset: 0 } : undefined} />
          <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: 'hsl(var(--foreground))' }} formatter={tooltipFormatter} />
          <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 3 }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function HistogramRenderer({ data }: { data: { label: string; value: number }[] }) {
  const tooltipStyle = {
    backgroundColor: 'hsl(var(--card))',
    borderColor: 'hsl(var(--border))',
    borderRadius: '8px',
  };

  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No session data available</p>;
  }

  return (
    <div className="h-44">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} className="text-muted-foreground" tickLine={false} />
          <YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" tickLine={false} width={40} allowDecimals={false} label={{ value: 'sessions', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: 'hsl(var(--muted-foreground))' }, offset: 0 }} />
          <Tooltip
            contentStyle={tooltipStyle}
            labelStyle={{ color: 'hsl(var(--foreground))' }}
            formatter={(value: number) => [`${value} sessions`, 'Count']}
          />
          <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function GaugeRenderer({ profileId, config, stats }: { profileId: string; config: ChartConfig; stats: CustomChartBuilderProps['stats'] }) {
  const rangeInfo = TIME_RANGES.find(r => r.value === config.time_range) || TIME_RANGES[1];
  const numWeeks = Math.min(rangeInfo.weeks, 12); // cap at 12 for display

  // Fetch all weekly goals for this user
  const { data: allGoals } = useQuery({
    queryKey: ['weekly-goals-all', profileId],
    queryFn: async () => {
      if (!profileId) return [];
      const { data, error } = await supabase
        .from('weekly_goals')
        .select('week_start, target_minutes, skipped')
        .eq('user_id', profileId)
        .order('week_start', { ascending: false })
        .limit(52);
      if (error) throw error;
      return data;
    },
    enabled: !!profileId,
    staleTime: 2 * 60 * 1000,
  });

  const formatMins = (m: number) => {
    if (m >= 60) {
      const h = Math.floor(m / 60);
      const r = m % 60;
      return r > 0 ? `${h}h ${r}m` : `${h}h`;
    }
    return `${m}m`;
  };

  // Build weekly gauge data
  const now = new Date();
  const weeks = useMemo(() => {
    const result: { label: string; pct: number; actual: number; target: number; isComplete: boolean; skipped: boolean; noGoal: boolean }[] = [];
    for (let i = numWeeks - 1; i >= 0; i--) {
      const ws = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
      const we = endOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
      const wsStr = format(ws, 'yyyy-MM-dd');
      const label = format(ws, 'MMM d');

      // Sum actual minutes from dailyMinutesMap
      let actual = 0;
      for (let d = 0; d < 7; d++) {
        const day = new Date(ws);
        day.setDate(day.getDate() + d);
        const dayStr = format(day, 'yyyy-MM-dd');
        actual += stats.dailyMinutesMap[dayStr] || 0;
      }

      const goal = allGoals?.find(g => g.week_start === wsStr);
      const target = goal?.target_minutes || 0;
      const skipped = goal?.skipped || false;
      const noGoal = !goal;
      const pct = target > 0 && !skipped ? Math.min(100, Math.round((actual / target) * 100)) : 0;

      result.push({ label, pct, actual, target, isComplete: pct >= 100, skipped, noGoal });
    }
    return result;
  }, [numWeeks, allGoals, stats.dailyMinutesMap]);

  const hasAnyGoals = weeks.some(w => !w.noGoal && !w.skipped);
  if (!hasAnyGoals) {
    return <p className="text-sm text-muted-foreground text-center py-8">No weekly goals set</p>;
  }

  // Filter to only weeks that have goals set
  const weeksWithGoals = weeks.filter(w => !w.noGoal && !w.skipped);

  return (
    <div className="flex flex-col items-center py-2 gap-3">
      <div className="flex flex-wrap justify-center gap-3">
        {weeksWithGoals.map((w, idx) => (
          <div key={idx} className="flex flex-col items-center gap-1">
            <div className="relative w-20 h-20">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
                <circle
                  cx="50" cy="50" r="40" fill="none"
                  stroke={w.isComplete ? 'hsl(150, 60%, 45%)' : 'hsl(var(--primary))'}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${w.pct * 2.51327} ${251.327 - w.pct * 2.51327}`}
                  className="transition-all duration-700"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-sm font-bold ${w.isComplete ? 'text-green-500' : 'text-foreground'}`}>
                  {w.pct}%
                </span>
                <span className="text-[8px] text-muted-foreground leading-tight">
                  {formatMins(w.actual)}
                </span>
              </div>
            </div>
            <span className="text-[10px] text-muted-foreground">{w.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DonutRenderer({ data }: { data: { label: string; value: number }[] }) {
  const isMobile = useIsMobile();

  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No data available</p>;
  }

  const total = data.reduce((s, d) => s + d.value, 0);
  const tooltipStyle = {
    backgroundColor: 'hsl(var(--card))',
    borderColor: 'hsl(var(--border))',
    borderRadius: '8px',
  };

  return (
    <div className="h-52">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            cx="50%"
            cy="50%"
            innerRadius={isMobile ? 40 : 50}
            outerRadius={isMobile ? 65 : 80}
            paddingAngle={2}
            label={({ label, value }) => `${label} (${Math.round((value / total) * 100)}%)`}
            labelLine={false}
            className="text-[9px]"
          >
            {data.map((_, idx) => (
              <Cell key={idx} fill={DONUT_COLORS[idx % DONUT_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value: number, name: string) => [`${value} (${Math.round((value / total) * 100)}%)`, name]}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

function ComparisonRenderer({ config, primaryData, secondaryData }: {
  config: ChartConfig;
  primaryData: { label: string; value: number }[];
  secondaryData: { label: string; value: number }[];
}) {
  const isMobile = useIsMobile();
  const primaryDef = METRICS.find(m => m.key === config.metric);
  const secondaryDef = METRICS.find(m => m.key === config.compare_metric);

  const merged = primaryData.map((d, i) => ({
    label: d.label,
    primary: d.value,
    secondary: secondaryData[i]?.value ?? 0,
  }));

  const dataLength = merged.length;
  const xInterval = isMobile
    ? Math.max(0, Math.ceil(dataLength / 4) - 1)
    : Math.max(0, Math.ceil(dataLength / 8) - 1);

  const tooltipStyle = {
    backgroundColor: 'hsl(var(--card))',
    borderColor: 'hsl(var(--border))',
    borderRadius: '8px',
  };

  const ChartComp = config.chart_type === 'bar' ? BarChart : LineChart;

  return (
    <div className="h-48">
      <div className="flex gap-3 mb-1.5 text-[10px]">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-primary inline-block" /> {primaryDef?.shortLabel}</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: 'hsl(38, 92%, 50%)' }} /> {secondaryDef?.shortLabel}</span>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <ChartComp data={merged}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} className="text-muted-foreground" tickLine={false} interval={xInterval} />
          <YAxis yAxisId="left" orientation="left" tick={{ fontSize: 10 }} className="text-muted-foreground" tickLine={false} width={46} label={primaryDef?.unit ? { value: primaryDef.unit, angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: 'hsl(var(--primary))' }, offset: 0 } : undefined} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} className="text-muted-foreground" tickLine={false} width={46} label={secondaryDef?.unit ? { value: secondaryDef.unit, angle: 90, position: 'insideRight', style: { fontSize: 10, fill: 'hsl(38, 92%, 50%)' }, offset: 0 } : undefined} />
          <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: 'hsl(var(--foreground))' }} />
          {config.chart_type === 'bar' ? (
            <>
              <Bar yAxisId="left" dataKey="primary" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={24} name={primaryDef?.shortLabel || 'Primary'} />
              <Bar yAxisId="right" dataKey="secondary" fill="hsl(38, 92%, 50%)" radius={[4, 4, 0, 0]} maxBarSize={24} name={secondaryDef?.shortLabel || 'Secondary'} />
            </>
          ) : (
            <>
              <Line yAxisId="left" type="monotone" dataKey="primary" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 3 }} name={primaryDef?.shortLabel || 'Primary'} />
              <Line yAxisId="right" type="monotone" dataKey="secondary" stroke="hsl(38, 92%, 50%)" strokeWidth={2} dot={{ fill: 'hsl(38, 92%, 50%)', strokeWidth: 0, r: 3 }} name={secondaryDef?.shortLabel || 'Secondary'} />
            </>
          )}
        </ChartComp>
      </ResponsiveContainer>
    </div>
  );
}

function ChartRenderer({ config, data, compareData, profileId, stats }: { config: ChartConfig; data: { label: string; value: number }[]; compareData?: { label: string; value: number }[]; profileId: string; stats: CustomChartBuilderProps['stats'] }) {
  if (config.compare_metric && compareData && (config.chart_type === 'line' || config.chart_type === 'bar')) {
    return <ComparisonRenderer config={config} primaryData={data} secondaryData={compareData} />;
  }
  if (config.chart_type === 'gauge') {
    return <GaugeRenderer profileId={profileId} config={config} stats={stats} />;
  }
  if (config.chart_type === 'histogram') {
    return <HistogramRenderer data={data} />;
  }
  if (config.chart_type === 'donut') {
    return <DonutRenderer data={data} />;
  }
  return <TimeSeriesRenderer config={config} data={data} />;
}

// ---- Visible Chart Card (renders a single saved view) ----
function VisibleChartCard({ view, stats, profileId }: { view: CustomChartView; stats: any; profileId: string }) {
  const parts = view.metric.split('|');
  const viewConfig: ChartConfig = {
    chart_type: (view.chart_type as ChartType) || 'line',
    metric: parts[0],
    compare_metric: parts[1] || undefined,
    time_granularity: view.time_granularity as 'weekly' | 'monthly',
    time_range: view.time_range,
  };

  // Fetch routine data when this card needs it (donut + routine_distribution)
  const needsRoutineData = viewConfig.metric === 'routine_distribution' || viewConfig.compare_metric === 'routine_distribution';
  const { data: routineData } = useQuery({
    queryKey: ['routine-distribution', profileId],
    queryFn: async () => {
      if (!profileId) return [];
      const { data, error } = await supabase
        .from('notes')
        .select('focus_title_snapshot')
        .eq('author_id', profileId)
        .not('focus_title_snapshot', 'is', null);
      if (error) throw error;
      return data as { focus_title_snapshot: string | null }[];
    },
    enabled: !!profileId && needsRoutineData,
    staleTime: 5 * 60 * 1000,
  });

  const chartData = useChartData(viewConfig, stats, routineData || undefined);
  const compareConfig = viewConfig.compare_metric ? { ...viewConfig, metric: viewConfig.compare_metric } : null;
  const compareData = useChartData(compareConfig || viewConfig, stats, routineData || undefined);

  return (
    <div className="border border-border/50 rounded-lg p-3">
      <div className="flex items-center justify-between mb-1.5">
        <h4 className="text-sm font-medium truncate">{view.name}</h4>
      </div>
      <ChartRenderer config={viewConfig} data={chartData} compareData={viewConfig.compare_metric ? compareData : undefined} profileId={profileId} stats={stats} />
    </div>
  );
}

// ---- Main Component ----
export function CustomChartBuilder({ profileId, stats }: CustomChartBuilderProps) {
  const { views, save, update, remove, isSaving } = useCustomChartViews(profileId);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [isManaging, setIsManaging] = useState(false);

  const [config, setConfig] = useState<ChartConfig>({
    chart_type: 'line',
    metric: 'practice_hours',
    time_granularity: 'weekly',
    time_range: '3m',
  });

  // Fetch routine distribution data (only when needed)
  const { data: routineData } = useQuery({
    queryKey: ['routine-distribution', profileId],
    queryFn: async () => {
      if (!profileId) return [];
      const { data, error } = await supabase
        .from('notes')
        .select('focus_title_snapshot')
        .eq('author_id', profileId)
        .not('focus_title_snapshot', 'is', null);
      if (error) throw error;
      return data as { focus_title_snapshot: string | null }[];
    },
    enabled: !!profileId && config.metric === 'routine_distribution',
    staleTime: 5 * 60 * 1000,
  });

  const chartData = useChartData(config, stats, routineData || undefined);
  const compareConfig = useMemo(() => config.compare_metric ? { ...config, metric: config.compare_metric } : null, [config]);
  const compareData = useChartData(compareConfig || config, stats);
  const metricDef = METRICS.find(m => m.key === config.metric);
  const compareMetricDef = METRICS.find(m => m.key === config.compare_metric);
  const showCompareOption = config.chart_type === 'line' || config.chart_type === 'bar';

  const handleChartTypeChange = useCallback((newType: string) => {
    const ct = newType as ChartType;
    setConfig(c => {
      const currentMetric = METRICS.find(m => m.key === c.metric);
      const isCompatible = currentMetric?.chartTypes.includes(ct);
      const firstCompatible = METRICS.find(m => m.chartTypes.includes(ct));
      const clearCompare = ct !== 'line' && ct !== 'bar';
      return {
        ...c,
        chart_type: ct,
        metric: isCompatible ? c.metric : (firstCompatible?.key || c.metric),
        compare_metric: clearCompare ? undefined : c.compare_metric,
      };
    });
  }, []);

  const loadView = useCallback((view: CustomChartView) => {
    setActiveViewId(view.id);
    const parts = view.metric.split('|');
    setConfig({
      chart_type: (view.chart_type as ChartType) || 'line',
      metric: parts[0],
      compare_metric: parts[1] || undefined,
      time_granularity: view.time_granularity as 'weekly' | 'monthly',
      time_range: view.time_range,
    });
    setIsEditing(false);
  }, []);

  const startNew = useCallback(() => {
    setActiveViewId(null);
    setConfig({
      chart_type: 'line',
      metric: 'practice_hours',
      time_granularity: 'weekly',
      time_range: '3m',
    });
    setIsEditing(true);
    setIsManaging(false);
    setEditName('');
  }, []);

  const handleSave = useCallback(() => {
    const name = editName.trim() || metricDef?.label || 'My Chart';
    const metricValue = config.compare_metric ? `${config.metric}|${config.compare_metric}` : config.metric;
    if (activeViewId) {
      update({ id: activeViewId, name, chart_type: config.chart_type, metric: metricValue, time_granularity: config.time_granularity, time_range: config.time_range }, {
        onSuccess: () => {
          toast.success('Chart view updated');
          setIsEditing(false);
        },
      });
    } else {
      save({
        user_id: profileId,
        name,
        chart_type: config.chart_type,
        metric: metricValue,
        time_granularity: config.time_granularity,
        time_range: config.time_range,
        display_order: views.length,
        visible: true,
      }, {
        onSuccess: () => {
          toast.success('Chart view saved');
          setIsEditing(false);
        },
      });
    }
  }, [config, editName, metricDef, profileId, save, update, activeViewId, views.length]);

  const handleDelete = useCallback((id: string) => {
    remove(id, {
      onSuccess: () => {
        toast.success('Chart view removed');
        if (activeViewId === id) {
          setActiveViewId(null);
          setIsEditing(false);
        }
      },
    });
  }, [activeViewId, remove]);


  const handleMoveView = useCallback((id: string, direction: -1 | 1) => {
    const idx = views.findIndex(v => v.id === id);
    if (idx < 0) return;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= views.length) return;

    // Swap display_order values
    const thisView = views[idx];
    const otherView = views[newIdx];
    update({ id: thisView.id, display_order: otherView.display_order });
    update({ id: otherView.id, display_order: thisView.display_order });
  }, [views, update]);

  const showGranularity = config.chart_type !== 'gauge';
  const showTimeRange = config.chart_type !== 'gauge';

  return (
    <Card className="p-4 bg-card border-border">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Custom Charts</h3>
        </div>
        <div className="flex items-center gap-1">
          {views.length > 0 && !isEditing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsManaging(m => !m)}
              className={`h-7 px-2 text-xs gap-1 ${isManaging ? 'text-primary' : ''}`}
            >
              <Settings2 className="w-3.5 h-3.5" />
              {isManaging ? 'Done' : 'Manage'}
            </Button>
          )}
          {!isEditing && (
            <Button variant="ghost" size="sm" onClick={startNew} className="h-7 px-2 text-xs gap-1">
              <Plus className="w-3.5 h-3.5" />
              New
            </Button>
          )}
        </div>
      </div>

      {/* Manage mode: reorder + rename + toggle visibility */}
      {isManaging && views.length > 0 && !isEditing && (
        <div className="space-y-1.5 mb-3">
          {views.map((view, idx) => {
            const visibleCount = views.filter(v => v.visible).length;
            const canToggleOn = visibleCount < 4;
            return (
              <div key={view.id} className="flex items-center gap-1.5 bg-muted/50 rounded-lg px-2 py-1.5">
                {/* Reorder arrows */}
                <button
                  type="button"
                  disabled={idx === 0}
                  onClick={() => handleMoveView(view.id, -1)}
                  className="p-1 rounded text-muted-foreground disabled:opacity-30 [@media(hover:hover)]:hover:text-foreground touch-manipulation"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={idx === views.length - 1}
                  onClick={() => handleMoveView(view.id, 1)}
                  className="p-1 rounded text-muted-foreground disabled:opacity-30 [@media(hover:hover)]:hover:text-foreground touch-manipulation"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                {/* Visibility toggle */}
                <button
                  type="button"
                  disabled={!view.visible && !canToggleOn}
                  onClick={() => update({ id: view.id, visible: !view.visible })}
                  className={`p-1 rounded touch-manipulation transition-colors ${
                    view.visible ? 'text-primary' : 'text-muted-foreground'
                  } ${!view.visible && !canToggleOn ? 'opacity-30 cursor-not-allowed' : '[@media(hover:hover)]:hover:text-foreground'}`}
                  title={!view.visible && !canToggleOn ? 'Max 4 charts can be visible at once' : view.visible ? 'Hide from profile' : 'Show on profile'}
                >
                  {view.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>

                <span className="flex-1 text-xs font-medium truncate">{view.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setActiveViewId(view.id);
                    const parts = view.metric.split('|');
                    setConfig({
                      chart_type: (view.chart_type as ChartType) || 'line',
                      metric: parts[0],
                      compare_metric: parts[1] || undefined,
                      time_granularity: view.time_granularity as 'weekly' | 'monthly',
                      time_range: view.time_range,
                    });
                    setEditName(view.name);
                    setIsManaging(false);
                    setIsEditing(true);
                  }}
                  className="h-7 w-7 p-0 text-muted-foreground"
                >
                  <Pencil className="w-3 h-3" />
                </Button>
                <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete chart?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently remove "{view.name}". This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(view.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
              </div>
            );
          })}
          {views.filter(v => v.visible).length >= 4 && (
            <p className="text-[10px] text-muted-foreground text-center">Maximum of 4 charts can be displayed at once</p>
          )}
        </div>
      )}

      {/* Visible charts displayed vertically */}
      {!isEditing && !isManaging && views.filter(v => v.visible).length > 0 && (
        <div className="space-y-4">
          {views.filter(v => v.visible).map(view => (
            <VisibleChartCard key={view.id} view={view} stats={stats} profileId={profileId} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isEditing && !isManaging && views.length === 0 && (
        <div className="text-center py-6">
          <BarChart3 className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground mb-3">
            Build a custom chart to visualize your practice data
          </p>
          <Button variant="outline" size="sm" onClick={startNew} className="gap-1.5">
            <Plus className="w-4 h-4" />
            Create Chart
          </Button>
        </div>
      )}

      {/* No visible charts hint */}
      {!isEditing && !isManaging && views.length > 0 && views.filter(v => v.visible).length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-4">
          No charts visible. Use <span className="font-medium">Manage</span> to toggle charts on.
        </p>
      )}

      {/* Chart builder / editor */}
      {isEditing && (
        <div className="space-y-3">
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder={metricDef?.label || 'Chart name'}
            className="h-9 text-sm"
          />

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Chart Type</label>
            <PillSelector
              options={CHART_TYPES.map(t => ({ value: t.value, label: t.label, icon: t.icon }))}
              value={config.chart_type}
              onChange={handleChartTypeChange}
              disabledValues={metricDef ? CHART_TYPES.map(t => t.value).filter(v => !metricDef.chartTypes.includes(v)) : []}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Metric</label>
            <MetricSelector
              value={config.metric}
              onChange={(v) => setConfig(c => ({ ...c, metric: v }))}
              chartType={config.chart_type}
              allowClear
            />
          </div>

          {showCompareOption && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-muted-foreground">Compare With</label>
                {config.compare_metric ? (
                  <button
                    type="button"
                    onClick={() => setConfig(c => ({ ...c, compare_metric: undefined }))}
                    className="text-[10px] text-muted-foreground hover:text-foreground"
                  >
                    Remove
                  </button>
                ) : null}
              </div>
              {config.compare_metric ? (
                <MetricSelector
                  value={config.compare_metric}
                  onChange={(v) => setConfig(c => ({ ...c, compare_metric: v || undefined }))}
                  chartType={config.chart_type}
                  allowClear
                />
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    const firstOther = METRICS.find(m => m.chartTypes.includes(config.chart_type) && m.key !== config.metric);
                    if (firstOther) setConfig(c => ({ ...c, compare_metric: firstOther.key }));
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors touch-manipulation"
                >
                  + Add second metric to compare
                </button>
              )}
            </div>
          )}

          {showGranularity && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Group By</label>
              <PillSelector
                options={[
                  { value: 'weekly', label: 'Weekly' },
                  { value: 'monthly', label: 'Monthly' },
                ]}
                value={config.time_granularity}
                onChange={(v) => setConfig(c => ({ ...c, time_granularity: v as 'weekly' | 'monthly' }))}
              />
            </div>
          )}

          {showTimeRange && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Time Range</label>
              <PillSelector
                options={TIME_RANGES.map(r => ({ value: r.value, label: r.label }))}
                value={config.time_range}
                onChange={(v) => setConfig(c => ({ ...c, time_range: v }))}
              />
            </div>
          )}

          <div className="pt-1">
            <p className="text-xs text-muted-foreground mb-2">Preview</p>
            <ChartRenderer config={config} data={chartData} compareData={config.compare_metric ? compareData : undefined} profileId={profileId} stats={stats} />
          </div>

          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={handleSave} disabled={isSaving} className="flex-1 gap-1.5">
              <Save className="w-4 h-4" />
              {activeViewId ? 'Update View' : 'Save View'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setIsEditing(false);
                if (views.length > 0) loadView(views[0]);
              }}
              className="gap-1.5"
            >
              <X className="w-4 h-4" />
              Cancel
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
