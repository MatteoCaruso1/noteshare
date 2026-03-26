import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { RefreshCw, Check, Trash2 } from 'lucide-react';
import { FocusBacklogEntry } from '@/hooks/useFocusBacklog';
import { cn } from '@/lib/utils';

interface RoutineSwitcherPopoverProps {
  backlogEntries: FocusBacklogEntry[];
  currentTitle: string;
  currentText: string;
  onSelect: (title: string, text: string) => void;
  onDelete: (id: string) => void;
  onAutoSave: (title: string, text: string) => void;
  isPremium: boolean;
  onUpgrade: () => void;
}

export function RoutineSwitcherPopover({
  backlogEntries,
  currentTitle,
  currentText,
  onSelect,
  onDelete,
  onAutoSave,
  isPremium,
  onUpgrade,
}: RoutineSwitcherPopoverProps) {
  const [open, setOpen] = useState(false);
  const [showUntitledDialog, setShowUntitledDialog] = useState(false);
  const [pendingEntry, setPendingEntry] = useState<FocusBacklogEntry | null>(null);

  // Deduplicate by title (keep most recent)
  const uniqueEntries = backlogEntries.reduce<FocusBacklogEntry[]>((acc, entry) => {
    if (!acc.find(e => e.focus_title === entry.focus_title)) {
      acc.push(entry);
    }
    return acc;
  }, []);

  const decodeText = (raw: string) => {
    try { return decodeURIComponent(raw); } catch { return raw; }
  };

  const doSwitch = (entry: FocusBacklogEntry) => {
    onSelect(entry.focus_title, decodeText(entry.focus_text));
    setOpen(false);
  };

  const handleSelect = (entry: FocusBacklogEntry) => {
    const isActive = currentTitle.trim().toLowerCase() === entry.focus_title.trim().toLowerCase();
    if (isActive) return; // already on this routine

    const hasContent = currentText.trim().length > 0;
    if (!hasContent) {
      // Nothing to save, just switch
      doSwitch(entry);
      return;
    }

    const hasTitle = currentTitle.trim().length > 0;
    if (hasTitle) {
      // Auto-save current routine then switch
      onAutoSave(currentTitle.trim(), currentText);
      doSwitch(entry);
    } else {
      // No title — ask user
      setPendingEntry(entry);
      setOpen(false);
      setShowUntitledDialog(true);
    }
  };

  const handleSwitchAnyway = () => {
    if (pendingEntry) {
      onSelect(pendingEntry.focus_title, decodeText(pendingEntry.focus_text));
    }
    setPendingEntry(null);
    setShowUntitledDialog(false);
  };

  const handleAddTitle = () => {
    setPendingEntry(null);
    setShowUntitledDialog(false);
    // User goes back to add a title — nothing else needed
  };

  if (!isPremium) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-primary"
            onClick={(e) => e.stopPropagation()}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-56 p-3"
          align="end"
          side="bottom"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-xs text-muted-foreground mb-2">
            Switch between saved routines with Pro.
          </p>
          <Button size="sm" className="w-full h-8 text-xs" onClick={() => { onUpgrade(); setOpen(false); }}>
            Upgrade to Pro
          </Button>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-primary"
            onClick={(e) => e.stopPropagation()}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-64 p-0"
          align="end"
          side="bottom"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-2 border-b border-border">
            <p className="text-xs font-medium text-muted-foreground">Saved Routines</p>
          </div>
          {uniqueEntries.length === 0 ? (
            <div className="px-3 py-4 text-center">
              <p className="text-xs text-muted-foreground">No saved routines yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Use the save button to add one.</p>
            </div>
          ) : (
            <div className="max-h-[240px] overflow-y-auto py-1">
              {uniqueEntries.map((entry) => {
                const isActive = currentTitle.trim().toLowerCase() === entry.focus_title.trim().toLowerCase();
                return (
                  <div
                    key={entry.id}
                    className={cn(
                      "flex items-center justify-between px-3 py-2 cursor-pointer transition-colors group",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-muted/50"
                    )}
                    onClick={() => handleSelect(entry)}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {isActive && <Check className="w-3.5 h-3.5 shrink-0 text-primary" />}
                      <span className={cn(
                        "text-sm truncate",
                        !isActive && "ml-5.5"
                      )}>
                        {entry.focus_title || 'Untitled routine'}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0 ml-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(entry.id);
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </PopoverContent>
      </Popover>

      <AlertDialog open={showUntitledDialog} onOpenChange={setShowUntitledDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved routine</AlertDialogTitle>
            <AlertDialogDescription>
              Add a title to save your current routine before switching routines.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleAddTitle}>Add title</AlertDialogCancel>
            <AlertDialogAction onClick={handleSwitchAnyway}>Switch anyway</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
