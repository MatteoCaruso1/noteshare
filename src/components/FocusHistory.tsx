import { useState, useMemo } from 'react';
import { useFocusHistory } from '@/hooks/useDailyFocus';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CalendarDays, ChevronDown, ChevronRight, History } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

interface FocusHistoryProps {
  onSelectDate?: (date: Date) => void;
}

export function FocusHistory({ onSelectDate }: FocusHistoryProps) {
  const { data: focusEntries, isLoading } = useFocusHistory();
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  // Create a set of dates that have focus entries for calendar highlighting
  const focusDatesSet = useMemo(() => {
    if (!focusEntries) return new Set<string>();
    return new Set(focusEntries.map(e => e.focus_date));
  }, [focusEntries]);

  // Get the selected focus entry
  const selectedEntry = useMemo(() => {
    if (!selectedDate || !focusEntries) return null;
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return focusEntries.find(e => e.focus_date === dateStr) || null;
  }, [selectedDate, focusEntries]);

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      onSelectDate?.(date);
    }
  };

  const handleEntryClick = (focusDate: string) => {
    const date = parseISO(focusDate);
    setSelectedDate(date);
    onSelectDate?.(date);
  };

  // Custom day renderer to highlight days with focus entries
  const modifiers = useMemo(() => ({
    hasFocus: (date: Date) => focusDatesSet.has(format(date, 'yyyy-MM-dd')),
  }), [focusDatesSet]);

  const modifiersClassNames = {
    hasFocus: 'bg-primary/20 font-semibold text-primary hover:bg-primary/30',
  };

  if (isLoading) {
    return (
      <Card className="bg-card border-border p-4">
        <div className="h-8 w-32 bg-muted rounded animate-pulse" />
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <button className="w-full p-4 flex items-center justify-between transition-colors rounded-lg group">
            <div className="flex items-center gap-2">
              <History className={`w-5 h-5 transition-colors ${isExpanded ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`} />
              <h2 className="font-semibold">Focus History</h2>
              {focusEntries && focusEntries.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  ({focusEntries.length} {focusEntries.length === 1 ? 'entry' : 'entries'})
                </span>
              )}
            </div>
            {isExpanded ? (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            )}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-4">
            {/* View Mode Toggle */}
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'calendar' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('calendar')}
                className="gap-2"
              >
                <CalendarDays className="w-4 h-4" />
                Calendar
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="gap-2"
              >
                <History className="w-4 h-4" />
                List
              </Button>
            </div>

            {viewMode === 'calendar' ? (
              <div className="space-y-4">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  modifiers={modifiers}
                  modifiersClassNames={modifiersClassNames}
                  className={cn("p-3 pointer-events-auto rounded-lg border border-border")}
                />
                
                {/* Selected Focus Preview */}
                {selectedEntry && (
                  <div className="p-3 bg-muted/50 rounded-lg border border-border">
                    <div className="flex items-center gap-2 mb-2">
                      <CalendarDays className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">
                        {format(parseISO(selectedEntry.focus_date), 'MMMM d, yyyy')}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-3">
                      {selectedEntry.focus_text || 'No focus text'}
                    </p>
                  </div>
                )}
                
                {selectedDate && !selectedEntry && (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    No focus entry for this date
                  </p>
                )}
              </div>
            ) : (
              <ScrollArea className="h-64">
                {focusEntries && focusEntries.length > 0 ? (
                  <div className="space-y-2 pr-4">
                    {focusEntries.map((entry) => (
                      <button
                        key={entry.id}
                        onClick={() => handleEntryClick(entry.focus_date)}
                        className={cn(
                          "w-full text-left p-3 rounded-lg border transition-colors",
                          selectedDate && format(selectedDate, 'yyyy-MM-dd') === entry.focus_date
                            ? "bg-primary/10 border-primary/30"
                            : "bg-muted/30 border-border hover:bg-muted/50"
                        )}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <CalendarDays className="w-3.5 h-3.5 text-primary" />
                          <span className="text-sm font-medium">
                            {format(parseISO(entry.focus_date), 'EEEE, MMMM d, yyyy')}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-2">
                          {entry.focus_text || 'No focus text'}
                        </p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No focus entries yet. Start by adding your focus for today!
                  </p>
                )}
              </ScrollArea>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
