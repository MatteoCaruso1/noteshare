import { useState, useRef, useCallback, useMemo } from 'react';
import { NoteWithAuthor } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ShareableNoteCard, CARD_STYLES, CardStyleId } from '@/components/ShareableNoteCard';
import { Share, Instagram, MessageCircle, Loader2, Check, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import html2canvas from 'html2canvas';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

// Platform detection helpers
const getDeviceInfo = () => {
  const ua = navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(ua);
  const isAndroid = /android/.test(ua);
  const isMobile = isIOS || isAndroid;
  const isDesktop = !isMobile;
  
  return { isIOS, isAndroid, isMobile, isDesktop };
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
      // Get the actual rendered dimensions
      const rect = cardRef.current.getBoundingClientRect();
      
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 3, // Higher resolution for quality
        useCORS: true,
        logging: false,
        width: rect.width,
        height: rect.height,
        // Ensure consistent font rendering
        onclone: (clonedDoc, element) => {
          // Force computed styles to be applied
          element.style.fontFamily = window.getComputedStyle(cardRef.current!).fontFamily;
        },
      });
      
      return new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob), 'image/png', 1.0);
      });
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
      
      // Order: 1. Practice card (image), 2. Audio file, 3. Text + link
      const files: File[] = [imageFile];
      
      // Fetch and add audio file if selected (comes after image)
      if (audioToInclude.length > 0) {
        const audioIndex = audioToInclude[0];
        const audioUrl = note.audio_files?.[audioIndex];
        const rawName = note.audio_file_names?.[audioIndex] || `Recording ${audioIndex + 1}`;
        
        if (audioUrl) {
          try {
            const { data, error } = await supabase.functions.invoke('get-signed-url', {
              body: { url: audioUrl }
            });
            
            if (!error && data?.results?.[audioUrl]) {
              const signedAudioUrl = data.results[audioUrl];
              const audioFile = await fetchAudioAsFile(signedAudioUrl, rawName);
              if (audioFile) {
                files.push(audioFile);
              }
            }
          } catch (audioErr) {
            console.warn('Could not fetch audio for sharing:', audioErr);
          }
        }
      }
      
      // Use short link format: notesharemusic.com/n/{first 8 chars of note ID}
      const shortId = note.id.slice(0, 8);
      const shareText = `Check out my session on Noteshare\n\nnotesharemusic.com/n/${shortId}`;
      
      // Check if Web Share API is available and supports our files
      if (navigator.share && navigator.canShare?.({ files })) {
        await navigator.share({
          files,
          text: shareText,
          // Don't include url property - prevents rich link preview in iMessage
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
  }, [generateImage, handleDownload, toast, audioToInclude, note.audio_files, note.audio_file_names, isExporting]);

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
