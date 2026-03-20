import { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { Search, Trash2, Calendar, StickyNote, RotateCcw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useFocusBacklog, FocusBacklogEntry } from '@/hooks/useFocusBacklog';
import { toast } from 'sonner';
import { PremiumGate } from '@/components/PremiumGate';

interface FocusBacklogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLoad?: (title: string, text: string) => void;
}

export function FocusBacklogDialog({ open, onOpenChange, onLoad }: FocusBacklogDialogProps) {
  const { backlogEntries, isLoading, deleteFromBacklog } = useFocusBacklog();
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState<string>('all');

  // Get unique months for filtering
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    backlogEntries.forEach((entry) => {
      const date = parseISO(entry.saved_at);
      months.add(format(date, 'yyyy-MM'));
    });
    return Array.from(months).sort().reverse();
  }, [backlogEntries]);

  // Filter entries
  const filteredEntries = useMemo(() => {
    return backlogEntries.filter((entry) => {
      const query = searchQuery.toLowerCase();
      if (query) {
        const matchesText = entry.focus_text.toLowerCase().includes(query);
        const matchesTitle = (entry.focus_title || '').toLowerCase().includes(query);
        if (!matchesText && !matchesTitle) return false;
      }

      if (dateFilter !== 'all') {
        const entryMonth = format(parseISO(entry.saved_at), 'yyyy-MM');
        if (entryMonth !== dateFilter) return false;
      }

      return true;
    });
  }, [backlogEntries, searchQuery, dateFilter]);

  const handleDelete = (id: string) => {
    deleteFromBacklog(id, {
      onSuccess: () => toast.success('Entry deleted'),
      onError: () => toast.error('Failed to delete'),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Practice Routine Backlog</DialogTitle>
        </DialogHeader>

        <PremiumGate 
          featureName="Practice Routine Backlog" 
          blur={false}
          showPreview={false}
          icon={StickyNote}
          description="Upgrade to Pro to view archived Practice Routines"
        >
          {/* Search and Filter */}
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search backlog..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                autoFocus={false}
              />
            </div>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-[140px]">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All time</SelectItem>
                {availableMonths.map((month) => (
                  <SelectItem key={month} value={month}>
                    {format(parseISO(month + '-01'), 'MMM yyyy')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Entries List */}
          <ScrollArea className="flex-1 -mx-6 px-6 min-h-0 overflow-y-auto">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-24 bg-muted/50 rounded animate-pulse" />
                ))}
              </div>
            ) : filteredEntries.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery || dateFilter !== 'all'
                  ? 'No matching entries found'
                  : 'No backlog entries yet'}
              </div>
            ) : (
              <div className="space-y-3 pb-4">
                {filteredEntries.map((entry) => (
                  <BacklogEntryCard
                    key={entry.id}
                    entry={entry}
                    onLoad={onLoad ? () => {
                      let cleanText = entry.focus_text;
                      try { cleanText = decodeURIComponent(cleanText); } catch { /* */ }
                      onLoad(entry.focus_title || '', cleanText);
                    } : undefined}
                    onDelete={() => handleDelete(entry.id)}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </PremiumGate>
      </DialogContent>
    </Dialog>
  );
}

interface BacklogEntryCardProps {
  entry: FocusBacklogEntry;
  onLoad?: () => void;
  onDelete: () => void;
}

function BacklogEntryCard({ entry, onLoad, onDelete }: BacklogEntryCardProps) {
  const decodedText = (() => {
    try { return decodeURIComponent(entry.focus_text); } catch { return entry.focus_text; }
  })();

  return (
    <Card className="p-3">
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="min-w-0 flex-1">
          {entry.focus_title ? (
            <p className="text-sm font-semibold truncate">{entry.focus_title}</p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            Saved {format(parseISO(entry.saved_at), 'MMM d')}
          </p>
        </div>
        <div className="flex gap-3 shrink-0">
          {onLoad && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  title="Load routine"
                >
                  <RotateCcw className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Load this Practice Routine?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Your current routine will be overwritten. Make sure you saved it first!
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onLoad}>
                    Load Routine
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-muted-foreground hover:text-muted-foreground"
                title="Delete entry"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed text-muted-foreground line-clamp-3">
        {decodedText}
      </pre>
    </Card>
  );
}
