import { useState, useRef, useCallback, useMemo } from 'react';
import { format } from 'date-fns';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { GroupEvent } from '@/hooks/useGroupDetails';
import { Link, MessageCircle, Music, Mic2, Piano, Guitar, Drum, Loader2, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { toPng } from 'html-to-image';
import { useFriends } from '@/hooks/useFriendships';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// Platform detection helpers
const getDeviceInfo = () => {
  const ua = navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(ua);
  const isAndroid = /android/.test(ua);
  const isMobile = isIOS || isAndroid;
  const isDesktop = !isMobile;
  
  return { isIOS, isAndroid, isMobile, isDesktop };
};

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
  const { profile } = useAuth();
  const [selectedStyle, setSelectedStyle] = useState<CardStyle>('primary');
  const [isExporting, setIsExporting] = useState(false);
  const [activeButton, setActiveButton] = useState<'imessage' | 'link' | null>(null);
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [isSendingToFriends, setIsSendingToFriends] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  
  // Detect device type - must be before any early returns
  const deviceInfo = useMemo(() => getDeviceInfo(), []);
  const canShareIMessage = deviceInfo.isIOS; // Only iOS has iMessage
  
  // Friends list for in-app sharing
  const { data: friends = [] } = useFriends();
  
  // Memoize computed values - must be before any early returns
  const eventDate = useMemo(() => event ? new Date(event.event_date) : null, [event]);
  const shareUrl = useMemo(() => event ? `${window.location.origin}/groups/${event.group_id}?event=${event.id}` : '', [event]);
  
  const handleCopyLink = useCallback(async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    toast.success('Link copied to clipboard');
  }, [shareUrl]);
  
  const generateImage = useCallback(async (): Promise<Blob | null> => {
    if (!cardRef.current) return null;

    try {
      // Ensure element is fully visible and rendered
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const dataUrl = await toPng(cardRef.current, {
        quality: 1.0,
        pixelRatio: 3, // Higher resolution
        cacheBust: true,
      });
      
      // Convert data URL to blob
      const response = await fetch(dataUrl);
      return await response.blob();
    } catch (err) {
      console.error('[ShareEventSheet] Error generating image:', err);
      return null;
    }
  }, []);
  
  const handleIMessageShare = useCallback(async () => {
    if (isExporting || !event) return; // Prevent double-click
    setIsExporting(true);
    setActiveButton('imessage');
    
    try {
      const blob = await generateImage();
      if (!blob) throw new Error('Failed to generate image');
      
      const imageFile = new File([blob], 'noteshare-event.png', { type: 'image/png' });
      const files: File[] = [imageFile];
      
      // Link to the event with period trick to prevent Apple rich link preview
      const shareText = `You're invited to my event on Noteshare!\n\n.${shareUrl}.`;
      
      // Check if Web Share API is available and supports our files
      if (navigator.share && navigator.canShare?.({ files })) {
        await navigator.share({
          files,
          text: shareText,
        });
        toast.success('Shared successfully!');
      } else if (navigator.share) {
        // Share without files (text only)
        await navigator.share({
          title: event.name,
          text: shareText,
        });
        toast.success('Shared successfully!');
      } else {
        toast.error('Sharing not supported on this device');
      }
    } catch (err) {
      // User cancelled share or error occurred
      if ((err as Error).name !== 'AbortError') {
        console.error('Share error:', err);
        toast.error('Share failed. Please try again.');
      }
    } finally {
      setIsExporting(false);
      setActiveButton(null);
    }
  }, [generateImage, shareUrl, event, isExporting]);

  const handleSendToFriends = useCallback(async () => {
    if (selectedFriendIds.length === 0 || !profile?.id || !event) return;
    
    setIsSendingToFriends(true);
    try {
      // Create a notification for each selected friend
      const notifications = selectedFriendIds.map((friendId) => ({
        user_id: friendId,
        type: 'event_invite',
        content: `invited you to the event "${event.name}"`,
        from_user_id: profile.id,
      }));
      
      const { error } = await supabase
        .from('notifications')
        .insert(notifications);
      
      if (error) throw error;
      
      toast.success(`Shared with ${selectedFriendIds.length} friend${selectedFriendIds.length > 1 ? 's' : ''}!`);
      setSelectedFriendIds([]);
    } catch (err) {
      console.error('Error sharing with friends:', err);
      toast.error('Failed to share with friends');
    } finally {
      setIsSendingToFriends(false);
    }
  }, [selectedFriendIds, profile?.id, event]);

  const currentStyle = useMemo(() => 
    STYLE_OPTIONS.find(s => s.id === selectedStyle) || STYLE_OPTIONS[0],
    [selectedStyle]
  );
  
  const availableStyles = useMemo(() => 
    eventCoverImage 
      ? STYLE_OPTIONS 
      : STYLE_OPTIONS.filter(s => s.id !== 'custom'),
    [eventCoverImage]
  );
  
  // Guard against null event - AFTER all hooks
  if (!event || !eventDate) return null;
  
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
            ref={cardRef}
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
            
            {/* Music icons decoration for music style - positioned higher to not overlap branding */}
            {currentStyle.id === 'music' && (
              <div className="absolute bottom-12 left-4 flex gap-2">
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
            
            {/* Branding - Music icon + Noteshare */}
            <div className="flex items-center justify-center gap-1.5 pt-2">
              <Music 
                className="w-4 h-4" 
                style={{ color: 'hsl(217, 91%, 60%)' }} // Primary blue
              />
              <span className="text-xs font-semibold opacity-80">Noteshare</span>
            </div>
          </div>
        </div>
        
        {/* Share Options */}
        <div className="space-y-6 pb-8">
          {/* External Share Options */}
          <div>
            <p className="font-semibold mb-3">Share outside Noteshare</p>
            
            <div className="flex gap-6">
              {/* Copy Link */}
              <button
                onClick={handleCopyLink}
                className="flex flex-col items-center gap-2"
              >
                <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
                  <Link className="w-5 h-5" />
                </div>
                <span className="text-xs text-center">Copy<br/>Link</span>
              </button>
              
              {/* iMessage - iOS only */}
              {canShareIMessage && (
                <button
                  onClick={handleIMessageShare}
                  disabled={isExporting}
                  className="flex flex-col items-center gap-2"
                >
                  <div className="w-14 h-14 rounded-full bg-green-500 flex items-center justify-center text-white">
                    {isExporting && activeButton === 'imessage' ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <MessageCircle className="w-5 h-5" />
                    )}
                  </div>
                  <span className="text-xs text-center">
                    {isExporting && activeButton === 'imessage' ? 'Preparing...' : 'iMessage'}
                  </span>
                </button>
              )}
            </div>
          </div>
          
          {/* In-App Friend Sharing */}
          {friends.length > 0 && (
            <div>
              <p className="font-semibold mb-3">Share with Noteshare friends</p>
              
              {/* Selected friends */}
              {selectedFriendIds.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {selectedFriendIds.map((friendId) => {
                    const friend = friends.find(f => f.id === friendId);
                    if (!friend) return null;
                    return (
                      <div
                        key={friend.id}
                        className="flex items-center gap-1.5 bg-primary/20 rounded-full pl-1 pr-2 py-0.5"
                      >
                        <Avatar className="w-5 h-5">
                          <AvatarImage src={friend.avatar || undefined} />
                          <AvatarFallback className="text-[10px]">
                            {friend.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs">{friend.name}</span>
                        <button
                          onClick={() => setSelectedFriendIds(prev => prev.filter(id => id !== friend.id))}
                          className="ml-0.5 text-muted-foreground hover:text-foreground"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
              
              {/* Friend selector */}
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto mb-3">
                {friends
                  .filter(f => !selectedFriendIds.includes(f.id))
                  .slice(0, 10)
                  .map((friend) => (
                    <button
                      key={friend.id}
                      onClick={() => setSelectedFriendIds(prev => [...prev, friend.id])}
                      className="flex items-center gap-1.5 bg-muted hover:bg-muted/80 rounded-full pl-1 pr-2 py-0.5 transition-colors"
                    >
                      <Avatar className="w-5 h-5">
                        <AvatarImage src={friend.avatar || undefined} />
                        <AvatarFallback className="text-[10px]">
                          {friend.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs">{friend.name}</span>
                    </button>
                  ))}
              </div>
              
              {/* Send button */}
              {selectedFriendIds.length > 0 && (
                <Button 
                  className="w-full" 
                  onClick={handleSendToFriends}
                  disabled={isSendingToFriends}
                >
                  {isSendingToFriends ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Send to {selectedFriendIds.length} Friend{selectedFriendIds.length > 1 ? 's' : ''}
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
