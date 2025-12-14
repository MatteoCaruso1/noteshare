import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { MessageSquareHeart, ChevronRight } from 'lucide-react';
import { FeedbackDialog } from './FeedbackDialog';

export function FeedbackCard() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <>
      <Card
        className="p-4 bg-card border-border cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setIsDialogOpen(true)}
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <MessageSquareHeart className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm">Help shape noteshare</h3>
            <p className="text-xs text-muted-foreground">
              Share what's working and what's not
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        </div>
      </Card>

      <FeedbackDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </>
  );
}