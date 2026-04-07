import { useState, useMemo, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Plus, Save, Trash2, BarChart3, LineChartIcon, X, ChevronDown, Check } from 'lucide-react';
import { useCustomChartViews, type CustomChartView } from '@/hooks/useCustomChartViews';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import { format, startOfWeek, startOfMonth, subWeeks, subMonths, endOfWeek, endOfMonth, isWithinInterval, parseISO } from 'date-fns';

// --- Metric definitions ---
interface MetricDef {
  key: string;
  label: string;
  shortLabel: string;
  unit: string;
  category: string;
  granularities: ('weekly' | 'monthly')[];
}

const METRICS: MetricDef[] = [
  { key: 'practice_minutes', label: 'Time Practiced', shortLabel: 'Time', unit: 'min', category: 'Time', granularities: ['weekly', 'monthly'] },
  { key: 'practice_hours', label: 'Hours Practiced', shortLabel: 'Hours', unit: 'hrs', category: 'Time', granularities: ['weekly', 'monthly'] },
  { key: 'session_count', label: 'Session Count', shortLabel: 'Sessions', unit: '', category: 'Activity', granularities: ['weekly', 'monthly'] },
  { key: 'avg_session_length', label: 'Avg Session Length', shortLabel: 'Avg Length', unit: 'min', category: 'Activity', granularities: ['weekly', 'monthly'] },
  { key: 'days_practiced', label: 'Days Practiced', shortLabel: 'Days', unit: 'days', category: 'Consistency', granularities: ['weekly', 'monthly'] },
  { key: 'notes_logged', label: 'Notes Logged', shortLabel: 'Notes', unit: '', category: 'Activity', granularities: ['weekly', 'monthly'] },
  { key: 'focus_level', label: 'Avg Focus Level', shortLabel: 'Focus', unit: '/5', category: 'Quality', granularities: ['weekly', 'monthly'] },
  { key: 'longest_session', label: 'Longest Session', shortLabel: 'Max Session', unit: 'min', category: 'Time', granularities: ['weekly', 'monthly'] },
  { key: 'practice_per_day', label: 'Avg Time Per Day Practiced', shortLabel: 'Min/Day', unit: 'min', category: 'Efficiency', granularities: ['weekly', 'monthly'] },
  { key: 'cumulative_hours', label: 'Cumulative Hours', shortLabel: 'Total Hrs', unit: 'hrs', category: 'Milestones', granularities: ['weekly', 'monthly'] },
];

const TIME_RANGES = [
  { value: '1m', label: '1 Month', weeks: 5, months: 1 },
  { value: '3m', label: '3 Months', weeks: 13, months: 3 },
  { value: '6m', label: '6 Months', weeks: 26, months: 6 },
  { value: '1y', label: '1 Year', weeks: 52, months: 12 },
];

const CHART_TYPES = [
  { value: 'line', label: 'Line', icon: LineChartIcon },
  { value: 'bar', label: 'Bar', icon: BarChart3 },
] as const;

interface ChartConfig {
  chart_type: 'line' | 'bar';
  metric: string;
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
  };
}

// Compute chart data from stats based on config
function useChartData(
  config: ChartConfig,
  stats: CustomChartBuilderProps['stats'],
) {
  return useMemo(() => {
    const now = new Date();
    const rangeInfo = TIME_RANGES.find(r => r.value === config.time_range) || TIME_RANGES[1];

    if (config.time_granularity === 'weekly') {
      const numWeeks = rangeInfo.weeks;
      const data: { label: string; value: number }[] = [];
      let cumulative = 0;

      // Pre-compute cumulative hours from all 52 weeks for cumulative metric
      if (config.metric === 'cumulative_hours') {
        const allWeeks = stats.weeklyMinutesOverTime;
        // Sum all weeks before the visible window
        for (let i = 0; i < allWeeks.length - numWeeks; i++) {
          cumulative += allWeeks[i].minutes;
        }
      }

      for (let i = numWeeks - 1; i >= 0; i--) {
        const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
        const weekEnd = endOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
        const weekLabel = format(weekStart, 'MMM d');

        // Find matching week in stats
        const weekData = stats.weeklyMinutesOverTime.find(w => w.week === weekLabel);
        const weekMinutes = weekData?.minutes || 0;
        const weekDays = stats.weeklyDaysPracticed.find(w => w.week === weekLabel)?.days || 0;
        const focusData = stats.weeklyFocusAverage.find(w => w.week === weekLabel);

        // Count sessions and notes from dailyMinutesMap for this week
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
          case 'practice_minutes': value = weekMinutes; break;
          case 'practice_hours': value = Math.round((weekMinutes / 60) * 100) / 100; break;
          case 'session_count': value = sessionCount; break;
          case 'avg_session_length': value = sessionCount > 0 ? Math.round(weekMinutes / sessionCount) : 0; break;
          case 'days_practiced': value = weekDays || totalDaysWithActivity; break;
          case 'notes_logged': value = sessionCount; break; // Approximation from daily activity
          case 'focus_level': value = focusData?.average || 0; break;
          case 'longest_session': value = longestDay; break;
          case 'practice_per_day': value = totalDaysWithActivity > 0 ? Math.round(weekMinutes / totalDaysWithActivity) : 0; break;
          case 'cumulative_hours':
            cumulative += weekMinutes;
            value = Math.round((cumulative / 60) * 10) / 10;
            break;
        }

        data.push({ label: weekLabel, value });
      }

      return data;
    } else {
      // Monthly
      const numMonths = rangeInfo.months;
      const data: { label: string; value: number }[] = [];
      let cumulative = 0;

      // For cumulative, sum everything before window
      if (config.metric === 'cumulative_hours') {
        const allWeeks = stats.weeklyMinutesOverTime;
        // Rough: sum all weeks (we'll recalculate properly within window)
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

        // Aggregate daily data for this month
        let monthMinutes = 0;
        let daysWithActivity = 0;
        let longestDay = 0;
        let dayCount = 0;

        const daysInMonth = monthEnd.getDate();
        for (let d = 1; d <= daysInMonth; d++) {
          const dayStr = format(new Date(monthStart.getFullYear(), monthStart.getMonth(), d), 'yyyy-MM-dd');
          const dayMins = stats.dailyMinutesMap[dayStr] || 0;
          if (dayMins > 0) {
            monthMinutes += dayMins;
            daysWithActivity++;
            if (dayMins > longestDay) longestDay = dayMins;
          }
          dayCount++;
        }

        // Focus: average from weekly data that falls within this month
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
          case 'practice_minutes': value = monthMinutes; break;
          case 'practice_hours': value = Math.round((monthMinutes / 60) * 100) / 100; break;
          case 'session_count': value = daysWithActivity; break;
          case 'avg_session_length': value = daysWithActivity > 0 ? Math.round(monthMinutes / daysWithActivity) : 0; break;
          case 'days_practiced': value = daysWithActivity; break;
          case 'notes_logged': value = daysWithActivity; break;
          case 'focus_level': value = avgFocus; break;
          case 'longest_session': value = longestDay; break;
          case 'practice_per_day': value = daysWithActivity > 0 ? Math.round(monthMinutes / daysWithActivity) : 0; break;
          case 'cumulative_hours':
            cumulative += monthMinutes;
            value = Math.round((cumulative / 60) * 10) / 10;
            break;
        }

        data.push({ label: monthLabel, value });
      }

      return data;
    }
  }, [config.metric, config.time_granularity, config.time_range, stats]);
}

// Parse "MMM d" week label back to approximate date
function parseWeekLabel(label: string, referenceDate: Date): Date | null {
  try {
    // Try parsing with current year, then previous year
    const year = referenceDate.getFullYear();
    const parsed = new Date(`${label} ${year}`);
    if (!isNaN(parsed.getTime())) return parsed;
    const parsed2 = new Date(`${label} ${year - 1}`);
    if (!isNaN(parsed2.getTime())) return parsed2;
  } catch { }
  return null;
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

function MetricSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const selected = METRICS.find(m => m.key === value);
  const categories = [...new Set(METRICS.map(m => m.category))];

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
                {METRICS.filter(m => m.category === cat).map(m => (
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

// ---- Chart Renderer ----
function ChartRenderer({ config, data }: { config: ChartConfig; data: { label: string; value: number }[] }) {
  const isMobile = useIsMobile();
  const metricDef = METRICS.find(m => m.key === config.metric);
  const unit = metricDef?.unit || '';
  
  const maxVal = Math.max(...data.map(d => d.value), 1);
  const dataLength = data.length;
  const xInterval = isMobile
    ? Math.max(0, Math.ceil(dataLength / 4) - 1)
    : Math.max(0, Math.ceil(dataLength / 8) - 1);

  const formatValue = (v: number) => {
    if (config.metric === 'focus_level') return v > 0 ? v.toFixed(1) : '—';
    if (config.metric === 'practice_hours' || config.metric === 'cumulative_hours') {
      return v < 1 ? `${Math.round(v * 60)}m` : `${v.toFixed(1)}h`;
    }
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
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10 }}
              className="text-muted-foreground"
              tickLine={false}
              interval={xInterval}
            />
            <YAxis
              tick={{ fontSize: 10 }}
              className="text-muted-foreground"
              tickLine={false}
              width={36}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
              formatter={tooltipFormatter}
            />
            <Bar
              dataKey="value"
              fill="hsl(var(--primary))"
              radius={[4, 4, 0, 0]}
              maxBarSize={32}
            />
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
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10 }}
            className="text-muted-foreground"
            tickLine={false}
            interval={xInterval}
          />
          <YAxis
            tick={{ fontSize: 10 }}
            className="text-muted-foreground"
            tickLine={false}
            width={36}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            labelStyle={{ color: 'hsl(var(--foreground))' }}
            formatter={tooltipFormatter}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---- Main Component ----
export function CustomChartBuilder({ profileId, stats }: CustomChartBuilderProps) {
  const { views, save, update, remove, isSaving } = useCustomChartViews(profileId);
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');

  // Current config (either from saved view or live editing)
  const [config, setConfig] = useState<ChartConfig>({
    chart_type: 'line',
    metric: 'practice_minutes',
    time_granularity: 'weekly',
    time_range: '3m',
  });

  const chartData = useChartData(config, stats);
  const metricDef = METRICS.find(m => m.key === config.metric);

  // Load a saved view
  const loadView = useCallback((view: CustomChartView) => {
    setActiveViewId(view.id);
    setConfig({
      chart_type: view.chart_type as 'line' | 'bar',
      metric: view.metric,
      time_granularity: view.time_granularity as 'weekly' | 'monthly',
      time_range: view.time_range,
    });
    setIsEditing(false);
  }, []);

  // Start creating a new chart
  const startNew = useCallback(() => {
    setActiveViewId(null);
    setConfig({
      chart_type: 'line',
      metric: 'practice_minutes',
      time_granularity: 'weekly',
      time_range: '3m',
    });
    setIsEditing(true);
    setEditName('');
  }, []);

  // Save current config
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

  // Delete a saved view
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

  return (
    <Card className="p-4 bg-card border-border">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Custom Charts</h3>
        </div>
        {!isEditing && (
          <Button
            variant="ghost"
            size="sm"
            onClick={startNew}
            className="h-7 px-2 text-xs gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            New
          </Button>
        )}
      </div>

      {/* Saved views tabs */}
      {views.length > 0 && !isEditing && (
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
      {activeViewId && !isEditing && (
        <>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-muted-foreground">
              {metricDef?.label} · {config.time_granularity === 'weekly' ? 'Weekly' : 'Monthly'} · {TIME_RANGES.find(r => r.value === config.time_range)?.label}
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(activeViewId)}
              className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
          <ChartRenderer config={config} data={chartData} />
        </>
      )}

      {/* Empty state */}
      {!activeViewId && !isEditing && views.length === 0 && (
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
          {/* Name input */}
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder={metricDef?.label || 'Chart name'}
            className="h-9 text-sm"
          />

          {/* Metric selector */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Metric</label>
            <MetricSelector
              value={config.metric}
              onChange={(v) => setConfig(c => ({ ...c, metric: v }))}
            />
          </div>

          {/* Chart type */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Chart Type</label>
            <PillSelector
              options={CHART_TYPES.map(t => ({ value: t.value, label: t.label, icon: t.icon }))}
              value={config.chart_type}
              onChange={(v) => setConfig(c => ({ ...c, chart_type: v as 'line' | 'bar' }))}
            />
          </div>

          {/* Time granularity */}
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

          {/* Time range */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Time Range</label>
            <PillSelector
              options={TIME_RANGES.map(r => ({ value: r.value, label: r.label }))}
              value={config.time_range}
              onChange={(v) => setConfig(c => ({ ...c, time_range: v }))}
            />
          </div>

          {/* Live preview */}
          <div className="pt-1">
            <p className="text-xs text-muted-foreground mb-2">Preview</p>
            <ChartRenderer config={config} data={chartData} />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 gap-1.5"
            >
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
