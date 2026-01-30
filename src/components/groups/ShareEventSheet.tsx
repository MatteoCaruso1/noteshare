import { useState } from 'react';
import { format } from 'date-fns';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { GroupEvent } from '@/hooks/useGroupDetails';
import { Copy, Link, Share2, Music, Mic2, Piano, Guitar, Drum } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ShareEventSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: GroupEvent;
  groupName: string;
  eventCoverImage?: string | null;
}

type CardStyle = 'primary' | 'gradient' | 'dark' | 'music' | 'custom';

interface StyleOption {
  id: CardStyle;
  label: string;
  bgClass: string;
  textClass: string;
  icon?: React.ReactNode;
  useCustomImage?: boolean;
}

const STYLE_OPTIONS: StyleOption[] = [
  { 
    id: 'primary', 
    label: 'Classic', 
    bgClass: 'bg-primary', 
    textClass: 'text-primary-foreground' 
  },
  { 
    id: 'gradient', 
    label: 'Gradient', 
    bgClass: 'bg-gradient-to-br from-primary to-secondary', 
    textClass: 'text-primary-foreground' 
  },
  { 
    id: 'dark', 
    label: 'Dark', 
    bgClass: 'bg-card border border-border', 
    textClass: 'text-card-foreground' 
  },
  { 
    id: 'music', 
    label: 'Music', 
    bgClass: 'bg-gradient-to-br from-violet-600 to-indigo-600', 
    textClass: 'text-white',
    icon: <Music className="w-12 h-12 opacity-20 absolute top-4 right-4" />
  },
  { 
    id: 'custom', 
    label: 'Photo', 
    bgClass: '', 
    textClass: 'text-white',
    useCustomImage: true
  },
];

const MUSIC_ICONS = [
  <Mic2 key="mic" className="w-6 h-6 opacity-30" />,
  <Piano key="piano" className="w-6 h-6 opacity-30" />,
  <Guitar key="guitar" className="w-6 h-6 opacity-30" />,
  <Drum key="drum" className="w-6 h-6 opacity-30" />,
];

export function ShareEventSheet({ open, onOpenChange, event, groupName, eventCoverImage }: ShareEventSheetProps) {
  const [selectedStyle, setSelectedStyle] = useState<CardStyle>('primary');
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

  const currentStyle = STYLE_OPTIONS.find(s => s.id === selectedStyle) || STYLE_OPTIONS[0];
  const availableStyles = eventCoverImage 
    ? STYLE_OPTIONS 
    : STYLE_OPTIONS.filter(s => s.id !== 'custom');
  
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto max-h-[90vh] rounded-t-2xl overflow-y-auto">
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
        
        {/* Style Picker */}
        <div className="flex gap-2 justify-center pb-4 overflow-x-auto">
          {availableStyles.map((style) => (
            <button
              key={style.id}
              onClick={() => setSelectedStyle(style.id)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                selectedStyle === style.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {style.label}
            </button>
          ))}
        </div>
        
        {/* Event Card Preview */}
        <div className="flex justify-center py-4">
          <div 
            className={cn(
              "w-64 rounded-xl p-6 text-center space-y-3 relative overflow-hidden",
              currentStyle.bgClass,
              currentStyle.textClass
            )}
            style={currentStyle.useCustomImage && eventCoverImage ? {
              backgroundImage: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.7)), url(${eventCoverImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            } : undefined}
          >
            {currentStyle.icon}
            
            {/* Music icons decoration for music style */}
            {currentStyle.id === 'music' && (
              <div className="absolute bottom-4 left-4 flex gap-2">
                {MUSIC_ICONS}
              </div>
            )}
            
            <p className="text-xs uppercase tracking-wide opacity-80">{groupName}</p>
            
            <h3 className="text-2xl font-bold">{event.name}</h3>
            
            <div className="space-y-1 text-sm opacity-90">
              <p>{format(eventDate, "MMMM d, yyyy")}</p>
              <p>{format(eventDate, "h:mm a")}</p>
              {event.location && <p className="opacity-80">{event.location}</p>}
              {event.is_virtual && <p className="opacity-80">Virtual Event</p>}
            </div>
            
            <div className={cn(
              "border border-dashed rounded-lg py-2 px-4 inline-flex items-center gap-1",
              currentStyle.id === 'dark' 
                ? "border-muted-foreground/40" 
                : "border-current/40"
            )}>
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
