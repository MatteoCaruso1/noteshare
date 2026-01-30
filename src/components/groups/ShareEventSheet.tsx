import { format } from 'date-fns';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { GroupEvent } from '@/hooks/useGroupDetails';
import { Copy, Link, Share2, X } from 'lucide-react';
import { toast } from 'sonner';

interface ShareEventSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: GroupEvent;
  groupName: string;
}

export function ShareEventSheet({ open, onOpenChange, event, groupName }: ShareEventSheetProps) {
  const eventDate = new Date(event.event_date);
  
  const shareUrl = `${window.location.origin}/groups/${event.group_id}?event=${event.id}`;
  
  const shareText = `${event.name}\n${format(eventDate, "MMMM d, yyyy 'at' h:mm a")}\n${event.location || 'Virtual Event'}\n\nJoin us on noteshare!`;
  
  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    toast.success('Link copied to clipboard');
  };
  
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: event.name,
          text: shareText,
          url: shareUrl,
        });
      } catch (err) {
        // User cancelled or share failed
        if ((err as Error).name !== 'AbortError') {
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  };
  
  const handleCopyToClipboard = async () => {
    await navigator.clipboard.writeText(shareText + '\n\n' + shareUrl);
    toast.success('Copied to clipboard');
  };
  
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto max-h-[90vh] rounded-t-2xl">
        <SheetHeader className="flex flex-row items-center justify-between pb-4">
          <Button
            variant="ghost"
            className="text-primary font-medium"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          <SheetTitle>Share Event</SheetTitle>
          <div className="w-12" /> {/* Spacer */}
        </SheetHeader>
        
        {/* Event Card Preview */}
        <div className="flex justify-center py-6">
          <div className="w-64 bg-primary rounded-xl p-6 text-primary-foreground text-center space-y-4">
            <p className="text-xs uppercase tracking-wide opacity-80">{groupName}</p>
            
            <h3 className="text-xl font-bold">{event.name}</h3>
            
            <div className="space-y-1 text-sm">
              <p>{format(eventDate, "MMMM d, yyyy")}</p>
              <p>{format(eventDate, "h:mm a")}</p>
              {event.location && <p className="opacity-80">{event.location}</p>}
              {event.is_virtual && <p className="opacity-80">Virtual Event</p>}
            </div>
            
            <div className="border border-dashed border-primary-foreground/40 rounded-lg py-2 px-4 inline-flex items-center gap-1">
              <Link className="w-3 h-3" />
              <span className="text-xs">Link here</span>
            </div>
            
            <p className="text-xs opacity-60">Join us on noteshare</p>
          </div>
        </div>
        
        {/* Share Options */}
        <div className="space-y-4 pb-8">
          <p className="font-semibold">Share to</p>
          
          <div className="flex gap-6">
            <button
              onClick={handleCopyToClipboard}
              className="flex flex-col items-center gap-2"
            >
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                <Copy className="w-5 h-5" />
              </div>
              <span className="text-xs text-center">Copy to<br/>Clipboard</span>
            </button>
            
            <button
              onClick={handleCopyLink}
              className="flex flex-col items-center gap-2"
            >
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                <Link className="w-5 h-5" />
              </div>
              <span className="text-xs text-center">Copy<br/>Link</span>
            </button>
            
            <button
              onClick={handleShare}
              className="flex flex-col items-center gap-2"
            >
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                <Share2 className="w-5 h-5" />
              </div>
              <span className="text-xs text-center">More</span>
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
