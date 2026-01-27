import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { NoteWithAuthor, Profile } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ShareableNoteCard, CARD_STYLES, CardStyleId, JammerInfo } from '@/components/ShareableNoteCard';
import { Share, Instagram, MessageCircle, Loader2, Check, Download, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toPng } from 'html-to-image';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useFriends } from '@/hooks/useFriendships';
import { getSignedUrls } from '@/hooks/useSignedUrl';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

// Platform detection helpers
const getDeviceInfo = () => {
  const ua = navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(ua);
  const isAndroid = /android/.test(ua);
  const isMobile = isIOS || isAndroid;
  const isDesktop = !isMobile;
  
  return { isIOS, isAndroid, isMobile, isDesktop };
};

// Helper to convert image URL to base64 data URL (for html2canvas CORS compatibility)
const convertToBase64 = async (url: string): Promise<string | null> => {
  try {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

// Helper to fetch audio file from signed URL and convert to File
// Uses m4a format for iMessage compatibility
const fetchAudioAsFile = async (signedUrl: string, fileName: string): Promise<File | null> => {
  try {
    const response = await fetch(signedUrl);
    if (!response.ok) throw new Error('Failed to fetch audio');
    
    const blob = await response.blob();
    
    // Clean the base filename (remove extension if any)
    const baseName = fileName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9.-]/g, '_');
    
    // Always use m4a format for iMessage compatibility (like Voice Memos)
    // Even though the actual content may be different, iMessage handles this better
    const outputFileName = `${baseName}.m4a`;
    
    // Use audio/mp4 MIME type for m4a files
    return new File([blob], outputFileName, { type: 'audio/mp4' });
  } catch (err) {
    console.error('Error fetching audio file:', err);
    return null;
  }
};

interface ShareNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note: NoteWithAuthor;
}

export function ShareNoteDialog({ open, onOpenChange, note }: ShareNoteDialogProps) {
  const { toast } = useToast();
  const cardRef = useRef<HTMLDivElement>(null);
  const [selectedStyle, setSelectedStyle] = useState<CardStyleId>('dark');
  const [isExporting, setIsExporting] = useState(false);
  // Default to first audio file if any exist
  const [audioToInclude, setAudioToInclude] = useState<number[]>(
    () => (note.audio_files?.length || 0) > 0 ? [0] : []
  );
  
  // Instruments input
  const [instrumentsInput, setInstrumentsInput] = useState('');
  const instruments = useMemo(() => {
    return instrumentsInput
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }, [instrumentsInput]);
  
  // Jammers (friends) picker with signed URL support
  const { data: friends = [] } = useFriends();
  const [selectedJammerIds, setSelectedJammerIds] = useState<string[]>([]);
  const [jammerAvatars, setJammerAvatars] = useState<Record<string, string>>({});
  
  // Fetch and sign jammer avatars using the existing useSignedUrl logic
  useEffect(() => {
    const fetchAvatars = async () => {
      const friendsWithAvatars = selectedJammerIds
        .map(id => friends.find(f => f.id === id))
        .filter((f): f is NonNullable<typeof f> => f !== null && !!f.avatar);
      
      if (friendsWithAvatars.length === 0) {
        setJammerAvatars({});
        return;
      }
      
      // Use the existing getSignedUrls batch function - handles external URLs,
      // public storage URLs, and relative paths with caching
      const urlsToSign = friendsWithAvatars.map(f => f.avatar!);
      
      try {
        const signedUrlMap = await getSignedUrls(urlsToSign);
        
        // Map friend IDs to their signed URLs
        const avatarMap: Record<string, string> = {};
        friendsWithAvatars.forEach(friend => {
          const signedUrl = signedUrlMap.get(friend.avatar!);
          if (signedUrl) {
            avatarMap[friend.id] = signedUrl;
          }
        });
        
        setJammerAvatars(avatarMap);
      } catch (err) {
        console.error('[ShareNoteDialog] Failed to get signed URLs:', err);
        setJammerAvatars({});
      }
    };
    
    if (selectedJammerIds.length > 0) {
      fetchAvatars();
    } else {
      setJammerAvatars({});
    }
  }, [selectedJammerIds, friends]);
  
  const selectedJammers: JammerInfo[] = useMemo(() => {
    return selectedJammerIds
      .map(id => {
        const friend = friends.find(f => f.id === id);
        if (!friend) return null;
        // Use signed URL if available, otherwise use original
        const avatar = jammerAvatars[id] || friend.avatar;
        return { id: friend.id, name: friend.name, avatar };
      })
      .filter((j): j is JammerInfo => j !== null);
  }, [selectedJammerIds, friends, jammerAvatars]);

  // Detect device type
  const deviceInfo = useMemo(() => getDeviceInfo(), []);
  const canShareIMessage = deviceInfo.isIOS; // Only iOS has iMessage
  const canShareInstagram = deviceInfo.isMobile; // Only mobile can share to Instagram

  const audioFiles = useMemo(() => {
    return (note.audio_files || []).map((url, idx) => ({
      url,
      name: note.audio_file_names?.[idx] || `Recording ${idx + 1}`,
      index: idx,
    }));
  }, [note.audio_files, note.audio_file_names]);

  const toggleAudio = useCallback((index: number) => {
    setAudioToInclude(prev => 
      prev.includes(index) 
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  }, []);

  const generateImage = useCallback(async (): Promise<Blob | null> => {
    if (!cardRef.current) return null;

    try {
      // Ensure element is fully visible and rendered
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Use html-to-image for pixel-perfect capture of the rendered DOM
      const dataUrl = await toPng(cardRef.current, {
        quality: 1.0,
        pixelRatio: 3, // Higher resolution
        cacheBust: true,
      });
      
      // Convert data URL to blob
      const response = await fetch(dataUrl);
      return await response.blob();
    } catch (err) {
      console.error('Error generating image:', err);
      return null;
    }
  }, []);

  const handleDownload = useCallback(async () => {
    if (isExporting) return; // Prevent double-click
    setIsExporting(true);
    try {
      const blob = await generateImage();
      if (!blob) throw new Error('Failed to generate image');
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `noteshare-practice-${note.id.slice(0, 8)}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({ title: 'Image saved!', duration: 2000 });
    } catch (err) {
      toast({ 
        title: 'Failed to save image', 
        description: 'Please try again',
        variant: 'destructive',
        duration: 3000,
      });
    } finally {
      setIsExporting(false);
    }
  }, [generateImage, note.id, toast, isExporting]);

  const handleShare = useCallback(async () => {
    if (isExporting) return; // Prevent double-click
    setIsExporting(true);
    try {
      const blob = await generateImage();
      if (!blob) throw new Error('Failed to generate image');
      
      const imageFile = new File([blob], 'noteshare-practice.png', { type: 'image/png' });
      
      // IMPORTANT: Only share the image for iMessage reliability
      // Large audio files (>5MB) cause "Not Delivered" errors in iMessage
      // Users can share audio separately if needed
      const files: File[] = [imageFile];
      
      // Use short link format for the production website
      const shortId = note.id.slice(0, 8);
      const shareText = `Check out my session on Noteshare\n\nhttps://notesharemusic.com/n/${shortId}`;
      
      // Check if Web Share API is available and supports our files
      if (navigator.share && navigator.canShare?.({ files })) {
        await navigator.share({
          files,
          text: shareText,
        });
        toast({ title: 'Shared successfully!', duration: 2000 });
      } else if (navigator.share) {
        // Share without files (text only)
        await navigator.share({
          title: 'My Practice Session',
          text: shareText,
        });
        toast({ title: 'Shared successfully!', duration: 2000 });
      } else {
        // Fallback: download and show message
        await handleDownload();
        toast({ 
          title: 'Image saved!', 
          description: 'Share it manually to your favorite app',
          duration: 3000,
        });
      }
    } catch (err) {
      // User cancelled share or error occurred
      if ((err as Error).name !== 'AbortError') {
        console.error('Share error:', err);
        toast({ 
          title: 'Could not share', 
          description: 'Image has been saved instead',
          variant: 'destructive',
          duration: 3000,
        });
        await handleDownload();
      }
    } finally {
      setIsExporting(false);
    }
  }, [generateImage, handleDownload, toast, note.id, isExporting]);

  const handleInstagramShare = useCallback(async () => {
    if (isExporting) return; // Prevent double-click
    setIsExporting(true);
    try {
      const blob = await generateImage();
      if (!blob) throw new Error('Failed to generate image');
      
      const file = new File([blob], 'noteshare-practice.png', { type: 'image/png' });
      
      // Try native share with just the image (cleaner for Instagram)
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
        });
        
        // Show helpful toast AFTER share completes
        toast({ 
          title: 'Image shared!',
          description: 'Tip: Add a link sticker to notesharemusic.com in Instagram',
          duration: 5000,
        });
      } else {
        // Fallback: download and provide instructions
        await handleDownload();
        toast({ 
          title: 'Image saved to your device!', 
          description: 'Open Instagram → Create Story → Select from Photos. Add a link sticker to notesharemusic.com',
          duration: 6000,
        });
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        await handleDownload();
        toast({ 
          title: 'Image saved!', 
          description: 'Open Instagram and share from your photo library. Add a link sticker to notesharemusic.com',
          duration: 6000,
        });
      }
    } finally {
      setIsExporting(false);
    }
  }, [generateImage, handleDownload, toast, isExporting]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share className="w-5 h-5" />
            Share Your Practice
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Preview Card */}
          <div className="flex justify-center">
            <div ref={cardRef} className="w-56">
              <ShareableNoteCard
                note={note}
                styleId={selectedStyle}
                audioToInclude={audioToInclude}
                instruments={instruments}
                jammers={selectedJammers}
              />
            </div>
          </div>

          {/* Style Selector */}
          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">Card Style</Label>
            <div className="flex flex-wrap gap-2">
              {CARD_STYLES.map((style) => (
                <button
                  key={style.id}
                  onClick={() => setSelectedStyle(style.id)}
                  className={cn(
                    'w-8 h-8 rounded-full transition-all relative',
                    style.bgClass,
                    selectedStyle === style.id 
                      ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' 
                      : 'opacity-70 hover:opacity-100'
                  )}
                  title={style.name}
                >
                  {selectedStyle === style.id && (
                    <Check className={cn(
                      'w-4 h-4 absolute inset-0 m-auto',
                      style.id === 'cream' || style.id === 'minimal' ? 'text-zinc-800' : 'text-white'
                    )} />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Instruments Input */}
          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">
              Instruments (comma-separated)
            </Label>
            <Input
              placeholder="e.g. Piano, Bass, Drums"
              value={instrumentsInput}
              onChange={(e) => setInstrumentsInput(e.target.value)}
              className="text-sm"
            />
          </div>

          {/* Jammers Picker */}
          {friends.length > 0 && (
            <div>
              <Label className="text-sm text-muted-foreground mb-2 block">
                Jamming With
              </Label>
              {/* Selected jammers */}
              {selectedJammers.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {selectedJammers.map((jammer) => (
                    <div
                      key={jammer.id}
                      className="flex items-center gap-1.5 bg-muted rounded-full pl-1 pr-2 py-0.5"
                    >
                      <Avatar className="w-5 h-5">
                        <AvatarImage src={jammer.avatar || undefined} />
                        <AvatarFallback className="text-[10px]">
                          {jammer.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs">{jammer.name}</span>
                      <button
                        onClick={() => setSelectedJammerIds(prev => prev.filter(id => id !== jammer.id))}
                        className="ml-0.5 text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {/* Friend selector */}
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {friends
                  .filter(f => !selectedJammerIds.includes(f.id))
                  .slice(0, 10)
                  .map((friend) => (
                    <button
                      key={friend.id}
                      onClick={() => setSelectedJammerIds(prev => [...prev, friend.id])}
                      className="flex items-center gap-1.5 bg-primary/15 hover:bg-primary/25 text-foreground rounded-full pl-1 pr-2 py-0.5 transition-colors border border-primary/20"
                    >
                      <Avatar className="w-5 h-5">
                        <AvatarImage src={friend.avatar || undefined} />
                        <AvatarFallback className="text-[10px] bg-primary/20 text-foreground">
                          {friend.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-medium">{friend.name}</span>
                    </button>
                  ))}
              </div>
            </div>
          )}

          {/* Audio Selection - max 1 */}
          {audioFiles.length > 0 && (
            <div>
              <Label className="text-sm text-muted-foreground mb-2 block">
                Select one recording to display
              </Label>
              <div className="space-y-2">
                {audioFiles.map((audio) => (
                  <div key={audio.index} className="flex items-center gap-2">
                    <Checkbox
                      id={`audio-${audio.index}`}
                      checked={audioToInclude.includes(audio.index)}
                      onCheckedChange={(checked) => {
                        // Only allow one selection - replace instead of toggle
                        if (checked) {
                          setAudioToInclude([audio.index]);
                        } else {
                          setAudioToInclude([]);
                        }
                      }}
                    />
                    <Label 
                      htmlFor={`audio-${audio.index}`}
                      className="text-sm cursor-pointer"
                    >
                      {audio.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Share Actions - Three buttons */}
          <div className="grid grid-cols-3 gap-2 pt-2">
            {/* iMessage - iOS only */}
            <Button
              variant="secondary"
              size="sm"
              onClick={handleShare}
              disabled={isExporting || !canShareIMessage}
              className={cn(
                "flex items-center justify-center gap-1.5 text-xs",
                !canShareIMessage && "opacity-50 cursor-not-allowed"
              )}
              title={!canShareIMessage ? "iMessage sharing is only available on iOS" : undefined}
            >
              {isExporting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <MessageCircle className="w-3.5 h-3.5" />
              )}
              <span className="hidden xs:inline">iMessage</span>
            </Button>
            
            {/* Instagram - Mobile only */}
            <Button
              variant="secondary"
              size="sm"
              onClick={handleInstagramShare}
              disabled={isExporting || !canShareInstagram}
              className={cn(
                "flex items-center justify-center gap-1.5 text-xs",
                !canShareInstagram && "opacity-50 cursor-not-allowed"
              )}
              title={!canShareInstagram ? "Instagram sharing is only available on mobile" : undefined}
            >
              {isExporting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Instagram className="w-3.5 h-3.5" />
              )}
              <span className="hidden xs:inline">Instagram</span>
            </Button>

            {/* Save Image - Available everywhere */}
            <Button
              variant="secondary"
              size="sm"
              onClick={handleDownload}
              disabled={isExporting}
              className="flex items-center justify-center gap-1.5 text-xs"
            >
              {isExporting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span className="hidden xs:inline">Save Image</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
