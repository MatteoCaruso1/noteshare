import { useMemo, useState } from 'react';
import { format, subDays, startOfWeek, addDays } from 'date-fns';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface CalendarHeatmapProps {
  dailyMinutesMap: Record<string, number>;
}

const CELL_SIZE = 11;
const CELL_GAP = 2;
const TOTAL = CELL_SIZE + CELL_GAP;
const WEEKS_TO_SHOW = 53; // ~365 days

function getColor(minutes: number | undefined): string {
  if (minutes === undefined || minutes === 0) return 'bg-red-100 dark:bg-red-950/40';
  if (minutes < 30) return 'bg-green-200 dark:bg-green-900/60';
  if (minutes < 60) return 'bg-green-400 dark:bg-green-600';
  return 'bg-green-600 dark:bg-green-400';
}

function getLabel(minutes: number | undefined): string {
  if (minutes === undefined || minutes === 0) return 'No practice';
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function CalendarHeatmap({ dailyMinutesMap }: CalendarHeatmapProps) {
  // Build grid data once, memoized
  const { grid, monthHeaders, todayStr } = useMemo(() => {
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');

    // Start from the most recent Sunday that is <= today, then go back WEEKS_TO_SHOW weeks
    const endWeekStart = startOfWeek(today, { weekStartsOn: 0 });
    const gridStartDate = subDays(endWeekStart, (WEEKS_TO_SHOW - 1) * 7);

    // Build columns (weeks) × rows (days 0-6, Sun-Sat)
    const grid: { date: string; minutes: number | undefined; isFuture: boolean }[][] = [];
    const monthHeaders: { label: string; colIndex: number }[] = [];
    let lastMonth = -1;

    for (let w = 0; w < WEEKS_TO_SHOW; w++) {
      const weekCol: { date: string; minutes: number | undefined; isFuture: boolean }[] = [];
      for (let d = 0; d < 7; d++) {
        const cellDate = addDays(gridStartDate, w * 7 + d);
        const dateStr = format(cellDate, 'yyyy-MM-dd');
        const isFuture = dateStr > todayStr;
        weekCol.push({
          date: dateStr,
          minutes: isFuture ? undefined : (dailyMinutesMap[dateStr] || 0),
          isFuture,
        });

        // Track month transitions for headers (use first day of week row 0)
        if (d === 0) {
          const month = cellDate.getMonth();
          if (month !== lastMonth) {
            monthHeaders.push({ label: MONTH_LABELS[month], colIndex: w });
            lastMonth = month;
          }
        }
      }
      grid.push(weekCol);
    }

    return { grid, monthHeaders, todayStr };
  }, [dailyMinutesMap]);

  const gridWidth = WEEKS_TO_SHOW * TOTAL;

  return (
    <div className="space-y-1">
      {/* Month labels */}
      <div className="relative overflow-x-auto scrollbar-none">
        <div style={{ width: gridWidth, minWidth: gridWidth }}>
          <div className="relative h-4 mb-1">
            {monthHeaders.map((mh, i) => (
              <span
                key={`${mh.label}-${i}`}
                className="absolute text-[10px] text-muted-foreground"
                style={{ left: mh.colIndex * TOTAL }}
              >
                {mh.label}
              </span>
            ))}
          </div>

          {/* Grid */}
          <div className="flex gap-[2px]">
            {grid.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[2px]">
                {week.map((cell) => (
                  <Tooltip key={cell.date} delayDuration={0}>
                    <TooltipTrigger asChild>
                      <div
                        className={`rounded-[2px] ${
                          cell.isFuture
                            ? 'bg-muted/30'
                            : getColor(cell.minutes)
                        }`}
                        style={{ width: CELL_SIZE, height: CELL_SIZE }}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs px-2 py-1">
                      <p className="font-medium">{format(new Date(cell.date + 'T12:00:00'), 'MMM d, yyyy')}</p>
                      <p className="text-muted-foreground">
                        {cell.isFuture ? 'Future' : getLabel(cell.minutes)}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-1.5 mt-2 text-[10px] text-muted-foreground">
            <span>Less</span>
            <div className="w-[11px] h-[11px] rounded-[2px] bg-red-100 dark:bg-red-950/40" />
            <div className="w-[11px] h-[11px] rounded-[2px] bg-green-200 dark:bg-green-900/60" />
            <div className="w-[11px] h-[11px] rounded-[2px] bg-green-400 dark:bg-green-600" />
            <div className="w-[11px] h-[11px] rounded-[2px] bg-green-600 dark:bg-green-400" />
            <span>More</span>
          </div>
        </div>
      </div>
    </div>
  );
}
