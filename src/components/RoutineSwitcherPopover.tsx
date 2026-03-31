import { useState, useMemo } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Check, Trash2, Search } from 'lucide-react';
import { FocusBacklogEntry } from '@/hooks/useFocusBacklog';
import { cn } from '@/lib/utils';

interface RoutineSwitcherPopoverProps {
  backlogEntries: FocusBacklogEntry[];
  isLoading?: boolean;
  currentTitle: string;
  currentText: string;
  onSelect: (title: string, text: string) => void;
  onDelete: (id: string) => void;
  onAutoSave: (title: string, text: string) => void;
  isPremium: boolean;
  onUpgrade: () => void;
  onSwitchGuard: () => boolean;
  onAutoSaveCurrent: () => void;
}

export function RoutineSwitcherPopover({
  backlogEntries,
  isLoading,
  currentTitle,
  currentText,
  onSelect,
  onDelete,
  isPremium,
  onUpgrade,
  onSwitchGuard,
  onAutoSaveCurrent,
}: RoutineSwitcherPopoverProps) {
  const [open, setOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

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

  const handleOpen = (newOpen: boolean) => {
    if (newOpen && !onSwitchGuard()) return;
    setOpen(newOpen);
  };

  const handleSelect = (entry: FocusBacklogEntry) => {
    const isActive = currentTitle.trim().toLowerCase() === entry.focus_title.trim().toLowerCase();
    if (isActive) return;

    // Auto-save current routine before switching
    onAutoSaveCurrent();
    onSelect(entry.focus_title, decodeText(entry.focus_text));
    setOpen(false);
  };

  if (!isPremium) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground hover:text-primary"
            onClick={(e) => e.stopPropagation()}
          >
            Switch
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
      <Popover open={open} onOpenChange={handleOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-muted-foreground hover:text-primary"
            onClick={(e) => e.stopPropagation()}
          >
            Switch
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
          {isLoading ? (
            <div className="px-3 py-4 text-center">
              <p className="text-xs text-muted-foreground">Loading routines…</p>
            </div>
          ) : uniqueEntries.length === 0 ? (
            <div className="px-3 py-4 text-center">
              <p className="text-xs text-muted-foreground">No saved routines yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Title a routine and switch to save it.</p>
            </div>
          ) : (
            <div className="max-h-[240px] overflow-y-auto py-1">
              {uniqueEntries.map((entry) => {
                const isActive = currentTitle.trim().toLowerCase() === entry.focus_title.trim().toLowerCase();
                return (
                  <div
                    key={entry.id}
                    className={cn(
                      "flex items-center justify-between px-3 py-2 cursor-pointer transition-colors",
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
                    {!isActive && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive shrink-0 ml-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget({ id: entry.id, title: entry.focus_title });
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </PopoverContent>
      </Popover>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent className="max-w-[280px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base">Delete routine?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              "{deleteTarget?.title}" will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-8 text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="h-8 text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) onDelete(deleteTarget.id);
                setDeleteTarget(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
