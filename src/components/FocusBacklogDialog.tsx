import { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { Copy, Search, Trash2, Calendar, StickyNote } from 'lucide-react';
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
      // Decode any URI-encoded text, then normalize to prevent encoding artifacts
      let cleanText = text;
      try {
        cleanText = decodeURIComponent(text);
      } catch {
        // If decodeURIComponent fails, the text wasn't encoded — use as-is
      }
      cleanText = cleanText.normalize('NFC');
      
      // Try modern clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(cleanText);
      } else {
        // Fallback for older browsers / iOS edge cases
        const textarea = document.createElement('textarea');
        textarea.value = cleanText;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        textarea.style.top = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      
      toast.success('Copied to clipboard');
    } catch (err) {
      console.error('Copy failed:', err);
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
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Practice Board Backlog</DialogTitle>
        </DialogHeader>

        <PremiumGate 
          featureName="Practice Board Backlog" 
          blur={false}
          showPreview={false}
          icon={StickyNote}
          description="Upgrade to Pro to view archived Practice Boards"
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
                    onCopy={() => handleCopy(entry.focus_text)}
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
  onCopy: () => void;
  onDelete: () => void;
}

function BacklogEntryCard({ entry, onCopy, onDelete }: BacklogEntryCardProps) {
  return (
    <Card className="p-3">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="text-xs text-muted-foreground">
          Saved {format(parseISO(entry.saved_at), 'MMM d')}
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
      <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed">
        {(() => {
          try { return decodeURIComponent(entry.focus_text); } catch { return entry.focus_text; }
        })()}
      </pre>
    </Card>
  );
}
