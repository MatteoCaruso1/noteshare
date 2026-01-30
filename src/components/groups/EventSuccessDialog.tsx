import { useState } from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CalendarCheck, X } from 'lucide-react';
import { GroupEvent } from '@/hooks/useGroupDetails';
import { ShareEventSheet } from './ShareEventSheet';

interface EventSuccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: GroupEvent | null;
  groupName: string;
}

export function EventSuccessDialog({ open, onOpenChange, event, groupName }: EventSuccessDialogProps) {
  const [showShare, setShowShare] = useState(false);
  
  const handleShare = () => {
    onOpenChange(false);
    setShowShare(true);
  };
  
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
          {/* Header with gradient */}
          <div className="relative bg-gradient-to-br from-primary/20 to-secondary/20 pt-12 pb-8 px-6">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-3 right-3 h-8 w-8 rounded-full bg-background/80"
              onClick={() => onOpenChange(false)}
            >
              <X className="w-4 h-4" />
            </Button>
            
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center">
                <CalendarCheck className="w-8 h-8 text-primary-foreground" />
              </div>
            </div>
          </div>
          
          {/* Content */}
          <div className="p-6 space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">Your event was created successfully</h2>
              <p className="text-muted-foreground">
                Modify details, share the event, and start making music together.
              </p>
            </div>
            
            <div className="space-y-3">
              <Button 
                className="w-full h-12"
                onClick={handleShare}
              >
                Share event
              </Button>
              <Button 
                variant="outline" 
                className="w-full h-12"
                onClick={() => onOpenChange(false)}
              >
                Dismiss
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {event && (
        <ShareEventSheet
          open={showShare}
          onOpenChange={setShowShare}
          event={event}
          groupName={groupName}
        />
      )}
    </>
  );
}
