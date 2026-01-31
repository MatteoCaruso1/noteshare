import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { GroupDetail } from '@/hooks/useGroupDetails';
import { Link, MessageCircle, Music, Users, Globe, Lock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { toPng } from 'html-to-image';
import { useSignedUrl } from '@/hooks/useSignedUrl';

// Platform detection helpers
const getDeviceInfo = () => {
  const ua = navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(ua);
  const isAndroid = /android/.test(ua);
  const isMobile = isIOS || isAndroid;
  const isDesktop = !isMobile;
  
  return { isIOS, isAndroid, isMobile, isDesktop };
};

interface ShareGroupSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: GroupDetail;
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

export function ShareGroupSheet({ open, onOpenChange, group }: ShareGroupSheetProps) {
  const [selectedStyle, setSelectedStyle] = useState<CardStyle>('primary');
  const [isExporting, setIsExporting] = useState(false);
  const [activeButton, setActiveButton] = useState<'imessage' | 'link' | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [avatarBase64, setAvatarBase64] = useState<string | null>(null);
  
  // Get the image to display - prefer profile_image, fall back to cover_image
  const avatarImagePath = group.profile_image || group.cover_image || '';
  const { signedUrl: avatarSignedUrl } = useSignedUrl(avatarImagePath);
  
  // Pre-convert avatar to base64 for html-to-image export (bypasses CORS)
  useEffect(() => {
    if (!avatarSignedUrl) {
      setAvatarBase64(null);
      return;
    }
    
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          setAvatarBase64(canvas.toDataURL('image/png'));
        }
      } catch (e) {
        console.error('[ShareGroupSheet] Failed to convert avatar to base64:', e);
      }
    };
    img.onerror = () => {
      console.error('[ShareGroupSheet] Failed to load avatar image');
      setAvatarBase64(null);
    };
    img.src = avatarSignedUrl;
  }, [avatarSignedUrl]);
  
  // Detect device type - must be before any early returns
  const deviceInfo = useMemo(() => getDeviceInfo(), []);
  // Show iMessage button on iOS, and show generic "Share" on other mobile devices
  const canShareNative = deviceInfo.isMobile && typeof navigator.share === 'function';
  
  // Use production URL for sharing - notesharemusic.com is the canonical domain
  // Fallback to window.location.origin for development/preview
  const shareUrl = useMemo(() => {
    const baseUrl = import.meta.env.PROD 
      ? 'https://notesharemusic.com' 
      : window.location.origin;
    return `${baseUrl}/groups/${group.id}`;
  }, [group.id]);
  
  const handleCopyLink = useCallback(async () => {
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
      console.error('[ShareGroupSheet] Error generating image:', err);
      return null;
    }
  }, []);
  
  const handleIMessageShare = useCallback(async () => {
    if (isExporting) return; // Prevent double-click
    setIsExporting(true);
    setActiveButton('imessage');
    
    try {
      const blob = await generateImage();
      if (!blob) throw new Error('Failed to generate image');
      
      const imageFile = new File([blob], 'noteshare-group.png', { type: 'image/png' });
      const files: File[] = [imageFile];
      
      // Message with group title and link
      const shareText = `Join my Noteshare group "${group.name}"!\n\n.${shareUrl}.`;
      
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
          title: group.name,
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
  }, [generateImage, shareUrl, group.name, isExporting]);

  const currentStyle = useMemo(() => 
    STYLE_OPTIONS.find(s => s.id === selectedStyle) || STYLE_OPTIONS[0],
    [selectedStyle]
  );
  
  const availableStyles = useMemo(() => 
    group.cover_image 
      ? STYLE_OPTIONS 
      : STYLE_OPTIONS.filter(s => s.id !== 'custom'),
    [group.cover_image]
  );
  
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
          <SheetTitle>Share Group</SheetTitle>
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
        
        {/* Group Card Preview */}
        <div className="flex justify-center py-4">
          <div 
            ref={cardRef}
            className={cn(
              "w-64 rounded-xl p-6 text-center space-y-3 relative overflow-hidden",
              currentStyle.bgClass,
              currentStyle.textClass
            )}
            style={currentStyle.useCustomImage && group.cover_image ? {
              backgroundImage: `linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.7)), url(${group.cover_image})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            } : undefined}
          >
            {currentStyle.icon}
            
            {/* Group avatar */}
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-xl bg-black/20 flex items-center justify-center overflow-hidden">
                {avatarBase64 ? (
                  <img 
                    src={avatarBase64} 
                    alt={group.name}
                    className="w-full h-full object-cover"
                  />
                ) : avatarSignedUrl ? (
                  <img 
                    src={avatarSignedUrl} 
                    alt={group.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Music className="w-8 h-8 opacity-60" />
                )}
              </div>
            </div>
            
            <h3 className="text-2xl font-bold">{group.name}</h3>
            
            <div className="flex items-center justify-center gap-3 text-sm opacity-90">
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <span>{group.member_count}</span>
              </div>
              <div className="flex items-center gap-1">
                {group.privacy === 'private' ? (
                  <Lock className="w-4 h-4" />
                ) : (
                  <Globe className="w-4 h-4" />
                )}
                <span className="capitalize">{group.privacy}</span>
              </div>
            </div>
            
            {group.description && (
              <p className="text-sm opacity-80 line-clamp-2">{group.description}</p>
            )}
            
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
        <div className="space-y-4 pb-8">
          <p className="text-sm text-muted-foreground text-center">
            Share this group with people outside Noteshare
          </p>
          
          <div className="flex justify-center gap-6">
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
            
            {/* Share - shows on mobile devices */}
            {canShareNative && (
              <button
                onClick={handleIMessageShare}
                disabled={isExporting}
                className="flex flex-col items-center gap-2"
              >
                <div className="w-14 h-14 rounded-full bg-green-600 flex items-center justify-center text-white">
                  {isExporting && activeButton === 'imessage' ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <MessageCircle className="w-5 h-5" />
                  )}
                </div>
                <span className="text-xs text-center">
                  {isExporting && activeButton === 'imessage' ? 'Preparing...' : deviceInfo.isIOS ? 'iMessage' : 'Share'}
                </span>
              </button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
