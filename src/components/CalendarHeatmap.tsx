import { useMemo, useState } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, subMonths, addMonths, isSameMonth } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

interface WeekGoalInfo {
  weekStart: string; // yyyy-MM-dd (Monday)
  targetMinutes: number;
  skipped: boolean;
}

interface CalendarHeatmapProps {
  dailyMinutesMap: Record<string, number>;
  weeklyGoals?: WeekGoalInfo[];
}

function getColor(minutes: number | undefined): string {
  if (minutes === undefined || minutes === 0) return 'bg-red-100 dark:bg-red-950/40';
  if (minutes < 60) return 'bg-green-200 dark:bg-green-900/60';
  return 'bg-green-500 dark:bg-green-500';
}

function getLabel(minutes: number | undefined): string {
  if (minutes === undefined || minutes === 0) return 'No practice';
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function fullWeekTotal(days: { minutes: number | undefined }[]): number {
  return days.reduce((sum, d) => sum + (d.minutes || 0), 0);
}

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function CalendarHeatmap({ dailyMinutesMap, weeklyGoals = [] }: CalendarHeatmapProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const { weeks, monthLabel, canGoNext } = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');

    const weeks: { 
      days: { date: string; day: number; minutes: number | undefined; isCurrentMonth: boolean; isFutureDay: boolean; isToday: boolean }[];
      weekStartStr: string;
    }[] = [];
    let day = calStart;

    while (day <= calEnd) {
      const weekDays: typeof weeks[number]['days'] = [];
      const weekStartStr = format(day, 'yyyy-MM-dd');
      for (let i = 0; i < 7; i++) {
        const dateStr = format(day, 'yyyy-MM-dd');
        const inMonth = isSameMonth(day, currentMonth);
        const futureDay = dateStr > todayStr;
        weekDays.push({
          date: dateStr,
          day: day.getDate(),
          minutes: futureDay ? undefined : (dailyMinutesMap[dateStr] || 0),
          isCurrentMonth: inMonth,
          isFutureDay: futureDay,
          isToday: dateStr === todayStr,
        });
        day = addDays(day, 1);
      }
      weeks.push({ days: weekDays, weekStartStr });
    }

    return {
      weeks,
      monthLabel: format(currentMonth, 'MMMM yyyy'),
      canGoNext: !isSameMonth(currentMonth, today),
    };
  }, [currentMonth, dailyMinutesMap]);

  // Build a map of weekStart -> goal info
  const goalMap = useMemo(() => {
    const m = new Map<string, WeekGoalInfo>();
    weeklyGoals.forEach(g => m.set(g.weekStart, g));
    return m;
  }, [weeklyGoals]);

  function getMetGoal(weekStartStr: string, total: number): 'yes' | 'no' | 'na' | 'tbd' {
    // Current week is TBD
    const currentWeekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    if (weekStartStr === currentWeekStart) {
      const goal = goalMap.get(weekStartStr);
      if (goal && !goal.skipped && goal.targetMinutes > 0) return 'tbd';
      return 'na';
    }
    const goal = goalMap.get(weekStartStr);
    if (!goal || goal.skipped || goal.targetMinutes <= 0) return 'na';
    return total >= goal.targetMinutes ? 'yes' : 'no';
  }

  return (
    <div className="space-y-2">
      {/* Month nav */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentMonth(m => subMonths(m, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium">{monthLabel}</span>
        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={!canGoNext} onClick={() => setCurrentMonth(m => addMonths(m, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-[repeat(7,1fr)_auto_auto] gap-1 text-[10px] text-muted-foreground font-medium">
        {DAY_LABELS.map((d, i) => (
          <div key={i} className="text-center">{d}</div>
        ))}
        <div className="w-12 text-center">Total</div>
        <div className="w-10 text-center">Goal</div>
      </div>

      {/* Weeks */}
      {weeks.map((week, wi) => {
        const total = fullWeekTotal(week.days);
        const metGoal = getMetGoal(week.weekStartStr, total);
        return (
          <div key={wi} className="grid grid-cols-[repeat(7,1fr)_auto_auto] gap-1 items-center">
            {week.days.map((cell) => (
              <div
                key={cell.date}
                title={`${format(new Date(cell.date + 'T12:00:00'), 'MMM d')}: ${cell.isFutureDay ? '—' : getLabel(cell.minutes)}`}
                className={`aspect-square rounded-md flex items-center justify-center text-[10px] font-medium transition-colors ${
                  cell.isFutureDay
                    ? 'bg-muted/30 text-muted-foreground/40'
                    : `${getColor(cell.minutes)} ${cell.isToday ? 'ring-2 ring-primary' : ''}`
                } ${!cell.isFutureDay && cell.minutes && cell.minutes >= 60 ? 'text-white dark:text-white' : 'text-foreground'}`}
              >
                {ordinal(cell.day)}
              </div>
            ))}
            <div className="w-12 text-center text-[10px] text-muted-foreground font-medium">
              {total > 0 ? (total < 60 ? `${total}m` : `${Math.floor(total / 60)}h${total % 60 > 0 ? ` ${total % 60}m` : ''}`) : '—'}
            </div>
            <div className={`w-10 text-center text-[10px] font-semibold ${
              metGoal === 'yes' ? 'text-green-500' : metGoal === 'no' ? 'text-red-400' : metGoal === 'tbd' ? 'text-yellow-500' : 'text-muted-foreground'
            }`}>
              {metGoal === 'yes' ? 'Yes' : metGoal === 'no' ? 'No' : metGoal === 'tbd' ? 'TBD' : 'N/A'}
            </div>
          </div>
        );
      })}

      {/* Legend */}
      <div className="flex items-center gap-1.5 mt-1 text-[10px] text-muted-foreground">
        <span>None</span>
        <div className="w-[11px] h-[11px] rounded-[2px] bg-red-100 dark:bg-red-950/40" />
        <div className="w-[11px] h-[11px] rounded-[2px] bg-green-200 dark:bg-green-900/60" />
        <div className="w-[11px] h-[11px] rounded-[2px] bg-green-500 dark:bg-green-500" />
        <span>Lots</span>
      </div>
    </div>
  );
}
