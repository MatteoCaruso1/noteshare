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
import { Link, MessageCircle, Music, Mic2, Piano, Guitar, Drum, Loader2, Check, X, Download, Calendar, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { cn, formatLocalDateTime } from '@/lib/utils';
import { toPng } from 'html-to-image';
import { useFriends } from '@/hooks/useFriendships';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { unlockScrollAfterClose } from '@/lib/scrollLock';
import { ProjectCover } from '@/components/ProjectCoverPicker';
import type { PromoPostWithAuthor } from '@/types';

// Platform detection helpers
const getDeviceInfo = () => {
  const ua = navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(ua);
  const isAndroid = /android/.test(ua);
  const isMobile = isIOS || isAndroid;
  const isDesktop = !isMobile;
  
  return { isIOS, isAndroid, isMobile, isDesktop };
};

interface ShareGigSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gig: PromoPostWithAuthor;
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

export function ShareGigSheet({ open, onOpenChange, gig }: ShareGigSheetProps) {
  const { profile } = useAuth();
  const [selectedStyle, setSelectedStyle] = useState<CardStyle>('primary');
  const [isExporting, setIsExporting] = useState(false);
  const [activeButton, setActiveButton] = useState<'imessage' | 'link' | null>(null);
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [isSendingToFriends, setIsSendingToFriends] = useState(false);
  const [customDescription, setCustomDescription] = useState(gig?.description || '');
  const cardRef = useRef<HTMLDivElement>(null);
  
  // Detect device type - must be before any early returns
  const deviceInfo = useMemo(() => getDeviceInfo(), []);
  const canShareNative = deviceInfo.isMobile && typeof navigator.share === 'function';
  const showShareButton = canShareNative || deviceInfo.isDesktop;
  
  // Friends list for in-app sharing
  const { data: friends = [] } = useFriends();
  
  // Memoize computed values - use formatLocalDateTime to preserve local timezone
  const formattedDate = useMemo(() => gig?.event_date ? formatLocalDateTime(gig.event_date, 'MMMM d, yyyy') : null, [gig]);
  const formattedTime = useMemo(() => gig?.event_date ? formatLocalDateTime(gig.event_date, 'h:mm a') : null, [gig]);
  const shareUrl = useMemo(() => gig ? `${window.location.origin}/gigs/${gig.id}` : '', [gig]);
  
  // Check if gig has a custom uploaded image (not a preset icon)
  const hasCustomImage = useMemo(() => {
    return gig?.image && !gig.image.startsWith('icon:');
  }, [gig]);
  
  const handleCopyLink = useCallback(async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    toast.success('Link copied to clipboard');
  }, [shareUrl]);
  
  const generateImage = useCallback(async (): Promise<Blob | null> => {
    if (!cardRef.current) return null;

    try {
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const dataUrl = await toPng(cardRef.current, {
        quality: 1.0,
        pixelRatio: 3,
        cacheBust: true,
      });
      
      const response = await fetch(dataUrl);
      return await response.blob();
    } catch (err) {
      console.error('[ShareGigSheet] Error generating image:', err);
      return null;
    }
  }, []);
  
  const handleShareOrSave = useCallback(async () => {
    if (isExporting || !gig) return;
    setIsExporting(true);
    setActiveButton('imessage');
    
    try {
      const blob = await generateImage();
      if (!blob) throw new Error('Failed to generate image');
      
      const imageFile = new File([blob], 'noteshare-gig.png', { type: 'image/png' });
      const files: File[] = [imageFile];
      
      const shareText = `Check out my gig on Noteshare!\n\n.${shareUrl}.`;
      
      if (canShareNative && navigator.share && navigator.canShare?.({ files })) {
        await navigator.share({
          files,
          text: shareText,
        });
        toast.success('Shared successfully!');
      } else if (canShareNative && navigator.share) {
        await navigator.share({
          title: gig.title,
          text: shareText,
        });
        toast.success('Shared successfully!');
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'noteshare-gig.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('Image saved! You can now share it manually.');
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('Share error:', err);
        toast.error('Share failed. Please try again.');
      }
    } finally {
      setIsExporting(false);
      setActiveButton(null);
    }
  }, [generateImage, shareUrl, gig, isExporting, canShareNative]);

  const handleSendToFriends = useCallback(async () => {
    if (selectedFriendIds.length === 0 || !profile?.id || !gig) return;
    
    setIsSendingToFriends(true);
    try {
      const notifications = selectedFriendIds.map((friendId) => ({
        user_id: friendId,
        type: 'gig_share',
        content: `shared a gig with you: "${gig.title}"`,
        from_user_id: profile.id,
        gig_id: gig.id,
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
  }, [selectedFriendIds, profile?.id, gig]);

  const currentStyle = useMemo(() => 
    STYLE_OPTIONS.find(s => s.id === selectedStyle) || STYLE_OPTIONS[0],
    [selectedStyle]
  );
  
  const availableStyles = useMemo(() => 
    hasCustomImage 
      ? STYLE_OPTIONS 
      : STYLE_OPTIONS.filter(s => s.id !== 'custom'),
    [hasCustomImage]
  );
  
  // Guard against null gig - AFTER all hooks
  if (!gig) return null;

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
    if (!nextOpen) unlockScrollAfterClose();
  };
  
  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="h-auto max-h-[90vh] rounded-t-2xl overflow-y-auto">
        <SheetHeader className="flex flex-row items-center justify-between pb-4">
          <Button
            variant="ghost"
            className="text-primary font-medium"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          <SheetTitle>Share Gig</SheetTitle>
          <div className="w-12" />
        </SheetHeader>
        
        {/* Style Picker */}
        <div className="flex gap-2 justify-center pb-4 overflow-x-auto">
          {availableStyles.map((style) => (
            <button
              key={style.id}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setSelectedStyle(style.id);
              }}
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
        
        {/* Gig Card Preview */}
        <div className="flex justify-center py-4">
          <div 
            ref={cardRef}
            className={cn(
              "w-64 rounded-xl p-6 text-center space-y-3 relative overflow-hidden",
              currentStyle.bgClass,
              currentStyle.textClass
            )}
            style={currentStyle.useCustomImage && hasCustomImage && gig.image ? {
              backgroundImage: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.7)), url(${gig.image})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            } : undefined}
          >
            {currentStyle.icon}
            
            {/* Music icons decoration for music style */}
            {currentStyle.id === 'music' && (
              <div className="absolute bottom-12 left-4 flex gap-2">
                {MUSIC_ICONS}
              </div>
            )}
            
            {/* Gig Cover Icon (when not using custom photo style) */}
            {!currentStyle.useCustomImage && gig.image && (
              <div className="flex justify-center mb-2">
                <div className="w-16 h-16 rounded-lg overflow-hidden">
                  <ProjectCover value={gig.image} className="w-16 h-16" />
                </div>
              </div>
            )}
            
            <h3 className="text-2xl font-bold">{gig.title}</h3>
            
            <div className="space-y-1 text-sm opacity-90">
              {formattedDate && (
                <>
                  <p className="flex items-center justify-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {formattedDate}
                  </p>
                  {formattedTime && <p>{formattedTime}</p>}
                </>
              )}
              {gig.is_paid_opportunity && (
                <p className="flex items-center justify-center gap-1 text-green-400">
                  <DollarSign className="w-3.5 h-3.5" />
                  Paid Opportunity
                </p>
              )}
              {customDescription && (
                <p className="opacity-80 line-clamp-2 pt-1">{customDescription}</p>
              )}
            </div>
            
            {/* Branding */}
            <div className="flex items-center justify-center gap-1.5 pt-2">
              <Music 
                className="w-4 h-4" 
                style={{ color: 'hsl(217, 91%, 60%)' }}
              />
              <span className="text-xs font-semibold opacity-80">Noteshare</span>
            </div>
          </div>
        </div>
        
        {/* Editable Description */}
        <div className="pb-4">
          <label className="text-sm text-muted-foreground block mb-2">Card description</label>
          <textarea
            value={customDescription}
            onChange={(e) => setCustomDescription(e.target.value.slice(0, 100))}
            placeholder="Add a short description..."
            maxLength={100}
            className="w-full bg-muted rounded-lg p-3 text-sm resize-none h-16 focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <p className="text-xs text-muted-foreground text-right mt-1">{customDescription.length}/100</p>
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
              
              {/* Share/Save Image */}
              {showShareButton && (
                <button
                  onClick={handleShareOrSave}
                  disabled={isExporting}
                  className="flex flex-col items-center gap-2"
                >
                  <div className="w-14 h-14 rounded-full bg-green-600 flex items-center justify-center text-white">
                    {isExporting && activeButton === 'imessage' ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : deviceInfo.isDesktop ? (
                      <Download className="w-5 h-5" />
                    ) : (
                      <MessageCircle className="w-5 h-5" />
                    )}
                  </div>
                  <span className="text-xs text-center">
                    {isExporting && activeButton === 'imessage' 
                      ? 'Preparing...' 
                      : deviceInfo.isDesktop 
                        ? 'Save Image' 
                        : deviceInfo.isIOS 
                          ? 'iMessage' 
                          : 'Share'}
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
