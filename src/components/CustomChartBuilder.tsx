import { useState, useMemo, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, RadialBarChart, RadialBar, Legend,
} from 'recharts';
import { Plus, Save, Trash2, BarChart3, LineChartIcon, X, ChevronDown, Check, PieChartIcon, Gauge, BarChart2, Pencil, ChevronLeft, ChevronRight, Settings2, Layers } from 'lucide-react';
import { useCustomChartViews, type CustomChartView } from '@/hooks/useCustomChartViews';
import { useIsMobile } from '@/hooks/use-mobile';
import { useWeeklyGoal, useCurrentWeekPracticeMinutes } from '@/hooks/useWeeklyGoal';
import { toast } from 'sonner';
import { format, startOfWeek, startOfMonth, subWeeks, subMonths, endOfWeek, endOfMonth, isWithinInterval, parseISO, subDays } from 'date-fns';

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
  { key: 'tag_distribution', label: 'Practice by Tag', shortLabel: 'Tags', unit: '', category: 'Distribution', granularities: ['weekly', 'monthly'], chartTypes: ['donut'] },
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
  compare_metric: string | null;
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
) {
  return useMemo(() => {
    const now = new Date();
    const rangeInfo = TIME_RANGES.find(r => r.value === config.time_range) || TIME_RANGES[1];

    // Special chart types that don't use time series
    if (config.chart_type === 'histogram') {
      return computeHistogramData(config, stats, rangeInfo);
    }
    if (config.chart_type === 'donut') {
      return computeDonutData(config, stats, rangeInfo);
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
  }, [config.metric, config.time_granularity, config.time_range, config.chart_type, stats]);
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
) {
  if (config.metric === 'tag_distribution') {
    // Use tags from stats
    const tags = stats.topTagsThisMonth || [];
    if (tags.length === 0) return [];
    // Filter out focus tags (F=N)
    const filtered = tags.filter(t => !/^F=[1-5]$/.test(t.tag));
    const top = filtered.slice(0, 8);
    return top.map(t => ({ label: t.tag, value: t.count }));
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

function PillSelector({ options, value, onChange, className = '' }: {
  options: { value: string; label: string; icon?: any }[];
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <div className={`flex gap-1 flex-wrap ${className}`}>
      {options.map(opt => {
        const Icon = opt.icon;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`px-2.5 py-1 text-xs font-medium rounded-full touch-manipulation select-none transition-colors flex items-center gap-1 ${
              value === opt.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground [@media(hover:hover)]:hover:bg-muted/80'
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

function MetricSelector({ value, onChange, chartType }: { value: string; onChange: (v: string) => void; chartType: ChartType }) {
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
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
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
            <YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" tickLine={false} width={36} />
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
          <YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" tickLine={false} width={36} />
          <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: 'hsl(var(--foreground))' }} formatter={tooltipFormatter} />
          <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 3 }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function ComparisonRenderer({ config, data, compareData }: { config: ChartConfig; data: { label: string; value: number }[]; compareData: { label: string; value: number }[] }) {
  const isMobile = useIsMobile();
  const metricDef = METRICS.find(m => m.key === config.metric);
  const compareDef = METRICS.find(m => m.key === config.compare_metric);

  const dataLength = data.length;
  const xInterval = isMobile
    ? Math.max(0, Math.ceil(dataLength / 4) - 1)
    : Math.max(0, Math.ceil(dataLength / 8) - 1);

  const tooltipStyle = {
    backgroundColor: 'hsl(var(--card))',
    borderColor: 'hsl(var(--border))',
    borderRadius: '8px',
  };

  // Merge data arrays by label
  const merged = data.map((d, i) => ({
    label: d.label,
    primary: d.value,
    secondary: compareData[i]?.value ?? 0,
  }));

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={merged}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="label" tick={{ fontSize: 10 }} className="text-muted-foreground" tickLine={false} interval={xInterval} />
          <YAxis yAxisId="left" tick={{ fontSize: 10 }} className="text-muted-foreground" tickLine={false} width={36} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} className="text-muted-foreground" tickLine={false} width={36} />
          <Tooltip
            contentStyle={tooltipStyle}
            labelStyle={{ color: 'hsl(var(--foreground))' }}
            formatter={(value: number, name: string) => {
              const label = name === 'primary' ? (metricDef?.shortLabel || 'Primary') : (compareDef?.shortLabel || 'Secondary');
              return [`${value}`, label];
            }}
          />
          <Legend
            formatter={(value: string) => value === 'primary' ? (metricDef?.shortLabel || 'Primary') : (compareDef?.shortLabel || 'Secondary')}
            wrapperStyle={{ fontSize: 11 }}
          />
          <Line yAxisId="left" type="monotone" dataKey="primary" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 2.5 }} activeDot={{ r: 4 }} />
          <Line yAxisId="right" type="monotone" dataKey="secondary" stroke="hsl(38, 92%, 50%)" strokeWidth={2} dot={{ fill: 'hsl(38, 92%, 50%)', strokeWidth: 0, r: 2.5 }} activeDot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}


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
          <YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" tickLine={false} width={30} allowDecimals={false} />
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

function GaugeRenderer({ profileId }: { profileId: string }) {
  const { currentWeekGoal } = useWeeklyGoal(profileId);
  const { minutes: currentMinutes, isLoading } = useCurrentWeekPracticeMinutes(profileId);

  if (!currentWeekGoal || currentWeekGoal.skipped) {
    return <p className="text-sm text-muted-foreground text-center py-8">No weekly goal set</p>;
  }

  const target = currentWeekGoal.target_minutes;
  const pct = isLoading ? 0 : Math.min(100, Math.round((currentMinutes / target) * 100));
  const isComplete = pct >= 100;

  const gaugeData = [
    { name: 'Progress', value: pct, fill: isComplete ? 'hsl(150, 60%, 45%)' : 'hsl(var(--primary))' },
  ];

  const formatMins = (m: number) => {
    if (m >= 60) {
      const h = Math.floor(m / 60);
      const r = m % 60;
      return r > 0 ? `${h}h ${r}m` : `${h}h`;
    }
    return `${m}m`;
  };

  return (
    <div className="flex flex-col items-center py-2">
      <div className="relative w-40 h-40">
        {/* Background ring */}
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
          <circle
            cx="50" cy="50" r="40" fill="none"
            stroke={isComplete ? 'hsl(150, 60%, 45%)' : 'hsl(var(--primary))'}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${pct * 2.51327} ${251.327 - pct * 2.51327}`}
            className="transition-all duration-700"
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-2xl font-bold ${isComplete ? 'text-green-500' : 'text-foreground'}`}>
            {pct}%
          </span>
          <span className="text-[10px] text-muted-foreground">
            {isLoading ? '...' : formatMins(currentMinutes)} / {formatMins(target)}
          </span>
        </div>
      </div>
      {isComplete && (
        <p className="text-xs text-green-500 font-medium mt-1">🎉 Goal achieved!</p>
      )}
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

function ChartRenderer({ config, data, profileId, compareData }: { config: ChartConfig; data: { label: string; value: number }[]; profileId: string; compareData?: { label: string; value: number }[] }) {
  if (config.chart_type === 'gauge') {
    return <GaugeRenderer profileId={profileId} />;
  }
  if (config.chart_type === 'histogram') {
    return <HistogramRenderer data={data} />;
  }
  if (config.chart_type === 'donut') {
    return <DonutRenderer data={data} />;
  }
  if (config.compare_metric && compareData && (config.chart_type === 'line' || config.chart_type === 'bar')) {
    return <ComparisonRenderer config={config} data={data} compareData={compareData} />;
  }
  return <TimeSeriesRenderer config={config} data={data} />;
}

// ---- Main Component ----
export function CustomChartBuilder({ profileId, stats }: CustomChartBuilderProps) {
  const { views, save, update, remove, isSaving } = useCustomChartViews(profileId);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [isManaging, setIsManaging] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const [config, setConfig] = useState<ChartConfig>({
    chart_type: 'line',
    metric: 'practice_hours',
    time_granularity: 'weekly',
    time_range: '3m',
  });

  const chartData = useChartData(config, stats);
  const metricDef = METRICS.find(m => m.key === config.metric);

  const handleChartTypeChange = useCallback((newType: string) => {
    const ct = newType as ChartType;
    setConfig(c => {
      const currentMetric = METRICS.find(m => m.key === c.metric);
      const isCompatible = currentMetric?.chartTypes.includes(ct);
      const firstCompatible = METRICS.find(m => m.chartTypes.includes(ct));
      return {
        ...c,
        chart_type: ct,
        metric: isCompatible ? c.metric : (firstCompatible?.key || c.metric),
      };
    });
  }, []);

  const loadView = useCallback((view: CustomChartView) => {
    setActiveViewId(view.id);
    setConfig({
      chart_type: (view.chart_type as ChartType) || 'line',
      metric: view.metric,
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
    save({
      user_id: profileId,
      name,
      chart_type: config.chart_type,
      metric: config.metric,
      time_granularity: config.time_granularity,
      time_range: config.time_range,
      display_order: views.length,
    }, {
      onSuccess: () => {
        toast.success('Chart view saved');
        setIsEditing(false);
      },
    });
  }, [config, editName, metricDef, profileId, save, views.length]);

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

  const handleRename = useCallback((id: string) => {
    const trimmed = renameValue.trim();
    if (!trimmed) return;
    update({ id, name: trimmed }, {
      onSuccess: () => {
        toast.success('Renamed');
        setRenamingId(null);
      },
    });
  }, [renameValue, update]);

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

      {/* Manage mode: reorder + rename */}
      {isManaging && views.length > 0 && !isEditing && (
        <div className="space-y-1.5 mb-3">
          {views.map((view, idx) => (
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

              {/* Name or rename input */}
              {renamingId === view.id ? (
                <form
                  className="flex-1 flex items-center gap-1"
                  onSubmit={(e) => { e.preventDefault(); handleRename(view.id); }}
                >
                  <Input
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    className="h-7 text-xs flex-1"
                    autoFocus
                  />
                  <Button type="submit" variant="ghost" size="sm" className="h-7 w-7 p-0">
                    <Check className="w-3.5 h-3.5" />
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setRenamingId(null)} className="h-7 w-7 p-0">
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </form>
              ) : (
                <>
                  <span className="flex-1 text-xs font-medium truncate">{view.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setRenamingId(view.id); setRenameValue(view.name); }}
                    className="h-7 w-7 p-0 text-muted-foreground"
                  >
                    <Pencil className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(view.id)}
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Saved views tabs */}
      {views.length > 0 && !isEditing && !isManaging && (
        <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
          {views.map(view => (
            <button
              key={view.id}
              type="button"
              onClick={() => loadView(view)}
              className={`flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg touch-manipulation select-none transition-colors ${
                activeViewId === view.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {view.name}
            </button>
          ))}
        </div>
      )}

      {/* Active saved view */}
      {activeViewId && !isEditing && !isManaging && (
        <>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">
              {metricDef?.label} · {config.time_granularity === 'weekly' ? 'Weekly' : 'Monthly'} · {TIME_RANGES.find(r => r.value === config.time_range)?.label}
            </p>
            <Button variant="ghost" size="sm" onClick={() => handleDelete(activeViewId)} className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive">
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
          <ChartRenderer config={config} data={chartData} profileId={profileId} />
        </>
      )}

      {/* Empty state */}
      {!activeViewId && !isEditing && !isManaging && views.length === 0 && (
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
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Metric</label>
            <MetricSelector
              value={config.metric}
              onChange={(v) => setConfig(c => ({ ...c, metric: v }))}
              chartType={config.chart_type}
            />
          </div>

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
            <ChartRenderer config={config} data={chartData} profileId={profileId} />
          </div>

          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={handleSave} disabled={isSaving} className="flex-1 gap-1.5">
              <Save className="w-4 h-4" />
              Save View
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
