import { useMemo, useState } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, subMonths, addMonths, isSameMonth, differenceInCalendarDays } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

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
  currentMonth?: Date;
  onMonthChange?: (month: Date) => void;
}

function getColor(minutes: number | undefined): string {
  if (minutes === undefined || minutes === 0) return 'bg-red-100 dark:bg-red-950/40';
  if (minutes < 45) return 'bg-green-200 dark:bg-green-900/60';
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

export function CalendarHeatmap({ dailyMinutesMap, weeklyGoals = [], currentMonth: controlledMonth, onMonthChange }: CalendarHeatmapProps) {
  const [internalMonth, setInternalMonth] = useState(new Date());
  const currentMonth = controlledMonth ?? internalMonth;
  const setCurrentMonth = onMonthChange ?? setInternalMonth;

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

  function getGoalStatus(weekStartStr: string, total: number): 'met' | 'pending' | 'missed' | 'na' {
    const goal = goalMap.get(weekStartStr);
    if (!goal || goal.skipped || goal.targetMinutes <= 0) return 'na';
    const currentWeekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    if (total >= goal.targetMinutes) return 'met';
    if (weekStartStr === currentWeekStart) return 'pending';
    return 'missed';
  }

  function formatGoalTime(minutes: number): string {
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h${m}m` : `${h}h`;
  }

  return (
    <div className="space-y-2">
      {/* Month nav */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-medium">{monthLabel}</span>
        <Button variant="ghost" size="icon" className="h-7 w-7" disabled={!canGoNext} onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-[repeat(7,1fr)_auto_auto] gap-1 text-[10px] text-muted-foreground font-medium">
        {DAY_LABELS.map((d, i) => (
          <div key={i} className="text-center">{d}</div>
        ))}
        <div className="w-12 text-center">Total</div>
        <div className="w-8 text-center">Goal</div>
      </div>

      {/* Weeks */}
      {weeks.map((week, wi) => {
        const total = fullWeekTotal(week.days);
        const goalStatus = getGoalStatus(week.weekStartStr, total);
        const goal = goalMap.get(week.weekStartStr);
        const goalLabel = (goal && !goal.skipped && goal.targetMinutes > 0) ? formatGoalTime(goal.targetMinutes) : '—';
        return (
          <div key={wi} className="grid grid-cols-[repeat(7,1fr)_auto_auto] gap-1 items-center">
            {week.days.map((cell) => (
              <Popover key={cell.date}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    disabled={cell.isFutureDay}
                    className={`aspect-square rounded-md flex items-center justify-center text-[10px] font-medium transition-colors cursor-pointer touch-manipulation ${
                      cell.isFutureDay
                        ? 'bg-muted/30 text-muted-foreground/40 cursor-default'
                        : `${getColor(cell.minutes)} ${cell.isToday ? 'ring-2 ring-foreground/60' : ''} [@media(hover:hover)]:hover:ring-2 [@media(hover:hover)]:hover:ring-foreground/50`
                    } ${!cell.isFutureDay && cell.minutes && cell.minutes >= 45 ? 'text-white dark:text-white' : 'text-foreground'}`}
                    data-no-hover-reset
                    onTouchEnd={(e) => (e.currentTarget as HTMLElement).blur()}
                  >
                    {ordinal(cell.day)}
                  </button>
                </PopoverTrigger>
                {!cell.isFutureDay && (
                  <PopoverContent side="top" className="w-auto px-3 py-2 text-xs" sideOffset={4}>
                    <p className="font-medium">{format(new Date(cell.date + 'T12:00:00'), 'EEE, MMM d')}</p>
                    <p className="text-muted-foreground">{getLabel(cell.minutes)}</p>
                  </PopoverContent>
                )}
              </Popover>
            ))}
            <div className="w-12 text-center text-[10px] text-muted-foreground font-medium">
              {total > 0 ? (total < 60 ? `${total}m` : `${Math.floor(total / 60)}h${total % 60 > 0 ? ` ${total % 60}m` : ''}`) : '—'}
            </div>
            <div className={`w-8 text-center text-[10px] font-semibold ${
              goalStatus === 'met' ? 'text-green-500' : goalStatus === 'pending' ? 'text-yellow-500' : goalStatus === 'missed' ? 'text-red-400' : 'text-muted-foreground'
            }`}>
              {goalLabel}
            </div>
          </div>
        );
      })}

      {/* Legend */}
      <div className="flex items-center gap-1.5 mt-1 text-[10px] text-muted-foreground">
        <span>None</span>
        <div className="w-[11px] h-[11px] rounded-[2px] bg-red-100 dark:bg-red-950/40 ring-1 ring-foreground/20" />
        <div className="w-[11px] h-[11px] rounded-[2px] bg-green-200 dark:bg-green-900/60 ring-1 ring-foreground/20" />
        <div className="w-[11px] h-[11px] rounded-[2px] bg-green-500 dark:bg-green-500 ring-1 ring-foreground/20" />
        <span>Lots</span>
      </div>
    </div>
  );
}
