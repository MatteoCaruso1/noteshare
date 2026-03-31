import { useState, useRef, useCallback, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth } from 'date-fns';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Music, MessageCircle, Loader2, Download, Send } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { toPng } from 'html-to-image';
import { unlockScrollAfterClose } from '@/lib/scrollLock';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCreateNote } from '@/hooks/useNotes';

const getDeviceInfo = () => {
  const ua = navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(ua);
  const isAndroid = /android/.test(ua);
  const isMobile = isIOS || isAndroid;
  const isDesktop = !isMobile;
  return { isIOS, isAndroid, isMobile, isDesktop };
};

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function getColor(minutes: number | undefined): string {
  if (minutes === undefined || minutes === 0) return 'bg-red-100 dark:bg-red-950/40';
  if (minutes < 45) return 'bg-green-200 dark:bg-green-900/60';
  return 'bg-green-500 dark:bg-green-500';
}

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

type CardStyle = 'primary' | 'gradient' | 'dark' | 'music';

interface StyleOption {
  id: CardStyle;
  label: string;
  bgClass: string;
  textClass: string;
  icon?: React.ReactNode;
}

const STYLE_OPTIONS: StyleOption[] = [
  { id: 'primary', label: 'Classic', bgClass: 'bg-primary', textClass: 'text-primary-foreground' },
  { id: 'gradient', label: 'Gradient', bgClass: 'bg-gradient-to-br from-primary to-secondary', textClass: 'text-primary-foreground' },
  { id: 'dark', label: 'Dark', bgClass: 'bg-card border border-border', textClass: 'text-card-foreground' },
  { id: 'music', label: 'Music', bgClass: 'bg-gradient-to-br from-violet-600 to-indigo-600', textClass: 'text-white', icon: <Music className="w-12 h-12 opacity-20 absolute top-4 right-4" /> },
];

interface WeekGoalInfo {
  weekStart: string;
  targetMinutes: number;
  skipped: boolean;
}

interface ShareCalendarSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dailyMinutesMap: Record<string, number>;
  weeklyGoals?: WeekGoalInfo[];
  userName: string;
  currentMonth: Date;
}

function fullWeekTotal(days: { minutes: number | undefined }[]): number {
  return days.reduce((sum, d) => sum + (d.minutes || 0), 0);
}

export function ShareCalendarSheet({
  open,
  onOpenChange,
  dailyMinutesMap,
  weeklyGoals = [],
  userName,
  currentMonth,
}: ShareCalendarSheetProps) {
  const [selectedStyle] = useState<CardStyle>('dark');
  const [isExporting, setIsExporting] = useState(false);
  const [activeButton, setActiveButton] = useState<'imessage' | 'save' | 'timeline' | null>(null);
  const [showGoalColumn, setShowGoalColumn] = useState(false);
  const [onlyCurrentMonthDays, setOnlyCurrentMonthDays] = useState(false);
  const [showDaysPracticed, setShowDaysPracticed] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const { profile } = useAuth();
  const createNote = useCreateNote();

  const deviceInfo = useMemo(() => getDeviceInfo(), []);
  const canShareNative = deviceInfo.isMobile && typeof navigator.share === 'function';

  const shareUrl = 'https://notesharemusic.com';
  const monthLabel = format(currentMonth, 'MMMM');
  const title = `${userName}'s ${monthLabel} Practice Calendar`;

  // Build calendar weeks for the card
  const weeks = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');

    const result: {
      days: { date: string; day: number; minutes: number | undefined; isCurrentMonth: boolean; isFutureDay: boolean }[];
      weekStartStr: string;
    }[] = [];
    let day = calStart;

    while (day <= calEnd) {
      const weekDays: typeof result[number]['days'] = [];
      const weekStartStr = format(day, 'yyyy-MM-dd');
      for (let i = 0; i < 7; i++) {
        const dateStr = format(day, 'yyyy-MM-dd');
        const futureDay = dateStr > todayStr;
        weekDays.push({
          date: dateStr,
          day: day.getDate(),
          minutes: futureDay ? undefined : (dailyMinutesMap[dateStr] || 0),
          isCurrentMonth: isSameMonth(day, currentMonth),
          isFutureDay: futureDay,
        });
        day = addDays(day, 1);
      }
      result.push({ days: weekDays, weekStartStr });
    }
    return result;
  }, [currentMonth, dailyMinutesMap]);

  // Goal map
  const goalMap = useMemo(() => {
    const m = new Map<string, WeekGoalInfo>();
    weeklyGoals.forEach(g => m.set(g.weekStart, g));
    return m;
  }, [weeklyGoals]);

  function getMetGoal(weekStartStr: string, total: number): 'yes' | 'no' | 'na' | 'tbd' {
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

  // Days practiced stat — adapts to visible days based on toggle
  const daysPracticedStat = useMemo(() => {
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');
    let practiced = 0;
    let total = 0;

    for (const week of weeks) {
      for (const cell of week.days) {
        if (onlyCurrentMonthDays && !cell.isCurrentMonth) continue;
        total++;
        if (cell.date > todayStr) continue;
        if ((cell.minutes || 0) > 0) practiced++;
      }
    }

    return { practiced, total };
  }, [weeks, onlyCurrentMonthDays]);

  const currentStyle = useMemo(() =>
    STYLE_OPTIONS.find(s => s.id === selectedStyle) || STYLE_OPTIONS[0],
    [selectedStyle]
  );

  const generateImage = useCallback(async (): Promise<Blob | null> => {
    if (!cardRef.current) return null;
    try {
      await new Promise(resolve => setTimeout(resolve, 150));
      const dataUrl = await toPng(cardRef.current, {
        quality: 1.0,
        pixelRatio: 3,
        cacheBust: true,
      });
      const response = await fetch(dataUrl);
      return await response.blob();
    } catch (err) {
      console.error('[ShareCalendarSheet] Error generating image:', err);
      return null;
    }
  }, []);

  const handleSaveImage = useCallback(async () => {
    if (isExporting) return;
    setIsExporting(true);
    setActiveButton('save');
    try {
      const blob = await generateImage();
      if (!blob) throw new Error('Failed to generate image');

      // On mobile, use navigator.share to show the native share sheet directly
      // (avoids the iOS quicklook/preview screen that anchor downloads trigger)
      if (deviceInfo.isMobile && navigator.share) {
        const imageFile = new File([blob], 'noteshare-practice-calendar.png', { type: 'image/png' });
        if (navigator.canShare?.({ files: [imageFile] })) {
          await navigator.share({ files: [imageFile] });
          toast.success('Image saved!');
        } else {
          // Fallback to anchor download if file sharing not supported
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'noteshare-practice-calendar.png';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          toast.success('Image saved!');
        }
      } else {
        // Desktop: use anchor download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'noteshare-practice-calendar.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('Image saved!');
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('Save error:', err);
        toast.error('Save failed. Please try again.');
      }
    } finally {
      setIsExporting(false);
      setActiveButton(null);
    }
  }, [generateImage, isExporting, deviceInfo.isMobile]);

  const handleShareMessages = useCallback(async () => {
    if (isExporting) return;
    setIsExporting(true);
    setActiveButton('imessage');
    try {
      const blob = await generateImage();
      if (!blob) throw new Error('Failed to generate image');
      const imageFile = new File([blob], 'noteshare-practice-calendar.png', { type: 'image/png' });
      const files: File[] = [imageFile];
      const shareText = `Check out my Practice Calendar on Noteshare!\n\n.${shareUrl}.`;
      if (navigator.share && navigator.canShare?.({ files })) {
        await navigator.share({ files, text: shareText });
        toast.success('Shared successfully!');
      } else if (navigator.share) {
        await navigator.share({ title, text: shareText });
        toast.success('Shared successfully!');
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('Share error:', err);
        toast.error('Share failed. Please try again.');
      }
    } finally {
      setIsExporting(false);
      setActiveButton(null);
    }
  }, [generateImage, shareUrl, title, isExporting]);

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
    if (!nextOpen) unlockScrollAfterClose();
  };

  const gridCols = showGoalColumn
    ? 'grid-cols-[repeat(7,1fr)_auto_auto]'
    : 'grid-cols-[repeat(7,1fr)_auto]';

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="h-auto max-h-[90vh] rounded-t-2xl overflow-y-auto">
        <SheetHeader className="flex flex-row items-center justify-between pb-4">
          <Button variant="ghost" className="text-primary font-medium" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <SheetTitle>Share Calendar</SheetTitle>
          <div className="w-12" />
        </SheetHeader>

        {/* Toggle Options */}
        <div className="space-y-3 px-1 pb-4">
          <div className="flex items-center justify-between">
            <span className="text-sm">Show goal column</span>
            <Switch
              checked={showGoalColumn}
              onCheckedChange={setShowGoalColumn}
              className="data-[state=checked]:bg-muted-foreground"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Only show {monthLabel} days</span>
            <Switch
              checked={onlyCurrentMonthDays}
              onCheckedChange={setOnlyCurrentMonthDays}
              className="data-[state=checked]:bg-muted-foreground"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Show days practiced stat</span>
            <Switch
              checked={showDaysPracticed}
              onCheckedChange={setShowDaysPracticed}
              className="data-[state=checked]:bg-muted-foreground"
            />
          </div>
        </div>

        {/* Calendar Card Preview */}
        <div className="flex justify-center py-4">
          <div
            ref={cardRef}
            className={cn(
              "w-80 rounded-xl p-5 relative overflow-hidden",
              currentStyle.bgClass,
              currentStyle.textClass
            )}
          >
            {currentStyle.icon}

            {/* Title */}
            <h3 className="text-base font-bold text-center mb-3">{title}</h3>

            {/* Day headers */}
            <div className={cn("grid gap-0.5 text-[8px] font-medium opacity-80 mb-1", gridCols)}>
              {DAY_LABELS.map((d, i) => (
                <div key={i} className="text-center">{d}</div>
              ))}
              <div className="w-9 text-center">Total</div>
              {showGoalColumn && <div className="w-8 text-center">Goal</div>}
            </div>

            {/* Weeks */}
            {weeks.map((week, wi) => {
              const total = onlyCurrentMonthDays
                ? week.days.reduce((sum, d) => sum + (d.isCurrentMonth ? (d.minutes || 0) : 0), 0)
                : fullWeekTotal(week.days);
              const metGoal = getMetGoal(week.weekStartStr, total);
              return (
                <div key={wi} className={cn("grid gap-0.5 items-center mb-0.5", gridCols)}>
                  {week.days.map((cell) => {
                    const hidden = onlyCurrentMonthDays && !cell.isCurrentMonth;
                    return (
                      <div
                        key={cell.date}
                        className={cn(
                          "aspect-square rounded-sm flex items-center justify-center text-[7px] font-medium",
                          hidden
                            ? 'bg-transparent'
                            : cell.isFutureDay
                              ? 'bg-white/10'
                              : getColor(cell.minutes),
                          !hidden && !cell.isFutureDay && cell.minutes && cell.minutes >= 45 ? 'text-white' : ''
                        )}
                      >
                        {hidden ? '' : ordinal(cell.day)}
                      </div>
                    );
                  })}
                  <div className="w-9 text-center text-[7px] font-medium opacity-80">
                    {total > 0 ? (total < 60 ? `${total}m` : `${Math.floor(total / 60)}h${total % 60 > 0 ? `${total % 60}m` : ''}`) : '—'}
                  </div>
                  {showGoalColumn && (
                    <div className={cn(
                      "w-8 text-center text-[7px] font-semibold",
                      metGoal === 'yes' ? 'text-green-400' : metGoal === 'no' ? 'text-red-400' : metGoal === 'tbd' ? 'text-yellow-400' : 'opacity-50'
                    )}>
                      {metGoal === 'yes' ? 'Yes' : metGoal === 'no' ? 'No' : metGoal === 'tbd' ? 'TBD' : 'N/A'}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Days Practiced Stat */}
            {showDaysPracticed && (
              <div className="text-center text-[9px] font-semibold mt-2 opacity-90">
                {daysPracticedStat.practiced}/{daysPracticedStat.total} days practiced
              </div>
            )}

            {/* Legend */}
            <div className="flex items-center gap-1 mt-2 text-[7px] opacity-70">
              <span>None</span>
              <div className="w-2.5 h-2.5 rounded-[2px] bg-red-100 dark:bg-red-950/40" />
              <div className="w-2.5 h-2.5 rounded-[2px] bg-green-200 dark:bg-green-900/60" />
              <div className="w-2.5 h-2.5 rounded-[2px] bg-green-500" />
              <span>Lots</span>
            </div>

            {/* Branding */}
            <div className="flex items-center justify-center gap-1.5 pt-3">
              <Music className="w-4 h-4" style={{ color: 'hsl(217, 91%, 60%)' }} />
              <span className="text-xs font-semibold opacity-80">Noteshare</span>
            </div>
          </div>
        </div>

        {/* Share Options */}
        <div className="space-y-6 pb-8">
          <div>
            <div className="flex gap-6 justify-center">
              <button
                onClick={handleSaveImage}
                disabled={isExporting && activeButton === 'save'}
                className="flex flex-col items-center gap-2"
              >
                <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                  {isExporting && activeButton === 'save' ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Download className="w-5 h-5" />
                  )}
                </div>
                <span className="text-xs text-center">
                  {isExporting && activeButton === 'save' ? 'Saving...' : 'Save\nImage'}
                </span>
              </button>

              {canShareNative && (
                <button
                  onClick={handleShareMessages}
                  disabled={isExporting && activeButton === 'imessage'}
                  className="flex flex-col items-center gap-2"
                >
                  <div className="w-14 h-14 rounded-full bg-green-600 flex items-center justify-center text-white">
                    {isExporting && activeButton === 'imessage' ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <MessageCircle className="w-5 h-5" />
                    )}
                  </div>
                  <span className="text-xs text-center">
                    {isExporting && activeButton === 'imessage'
                      ? 'Preparing...'
                      : deviceInfo.isIOS
                        ? 'iMessage'
                        : 'Messages'}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
