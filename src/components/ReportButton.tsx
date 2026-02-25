import { useState } from 'react';
import { Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useReport } from '@/hooks/useReport';

interface ReportButtonProps {
  itemType: 'comment' | 'group_post';
  itemId: string;
  reportedUserId: string;
}

export function ReportButton({ itemType, itemId, reportedUserId }: ReportButtonProps) {
  const [open, setOpen] = useState(false);
  const report = useReport();

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 text-muted-foreground/50 hover:text-destructive"
        onClick={() => setOpen(true)}
        title="Report"
      >
        <Flag className="w-3 h-3" />
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Report this {itemType === 'comment' ? 'comment' : 'post'}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will be reviewed by the noteshare team. False reports may result in action on your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                report.mutate({ reportedItemType: itemType, reportedItemId: itemId, reportedUserId });
                setOpen(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, report
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
