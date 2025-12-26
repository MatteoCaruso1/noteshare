import { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { Copy, Search, Trash2, Calendar } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

interface FocusBacklogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FocusBacklogDialog({ open, onOpenChange }: FocusBacklogDialogProps) {
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
      // Search filter
      if (searchQuery && !entry.focus_text.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      // Date filter
      if (dateFilter !== 'all') {
        const entryMonth = format(parseISO(entry.saved_at), 'yyyy-MM');
        if (entryMonth !== dateFilter) {
          return false;
        }
      }

      return true;
    });
  }, [backlogEntries, searchQuery, dateFilter]);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleDelete = (id: string) => {
    deleteFromBacklog(id, {
      onSuccess: () => toast.success('Entry deleted'),
      onError: () => toast.error('Failed to delete'),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Focus Backlog</DialogTitle>
        </DialogHeader>

        {/* Search and Filter */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search backlog..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
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
        <ScrollArea className="flex-1 -mx-6 px-6">
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
                  onCopy={() => handleCopy(entry.focus_text)}
                  onDelete={() => handleDelete(entry.id)}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

interface BacklogEntryCardProps {
  entry: FocusBacklogEntry;
  onCopy: () => void;
  onDelete: () => void;
}

function BacklogEntryCard({ entry, onCopy, onDelete }: BacklogEntryCardProps) {
  return (
    <Card className="p-3">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="text-xs text-muted-foreground">
          Saved {format(parseISO(entry.saved_at), 'MMM d, yyyy · h:mm a')}
          {entry.original_focus_date && (
            <span className="ml-1">
              (from {format(parseISO(entry.original_focus_date), 'MMM d')})
            </span>
          )}
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={onCopy}
            title="Copy to clipboard"
          >
            <Copy className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
            onClick={onDelete}
            title="Delete entry"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
      <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed">
        {entry.focus_text}
      </pre>
    </Card>
  );
}
