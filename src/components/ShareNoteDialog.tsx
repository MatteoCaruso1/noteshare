import { useState, useRef, useCallback, useMemo } from 'react';
import { NoteWithAuthor } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ShareableNoteCard, CARD_STYLES, CardStyleId } from '@/components/ShareableNoteCard';
import { Share, Download, Instagram, MessageCircle, Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import html2canvas from 'html2canvas';
import { useToast } from '@/hooks/use-toast';

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
  const [audioToInclude, setAudioToInclude] = useState<number[]>(
    () => (note.audio_files || []).map((_, i) => i) // Include all by default
  );

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
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 2, // Higher resolution for quality
        useCORS: true,
        logging: false,
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
      
      toast({ title: 'Image saved!' });
    } catch (err) {
      toast({ 
        title: 'Failed to save image', 
        description: 'Please try again',
        variant: 'destructive' 
      });
    } finally {
      setIsExporting(false);
    }
  }, [generateImage, note.id, toast]);

  const handleShare = useCallback(async () => {
    setIsExporting(true);
    try {
      const blob = await generateImage();
      if (!blob) throw new Error('Failed to generate image');
      
      const file = new File([blob], 'noteshare-practice.png', { type: 'image/png' });
      const shareText = 'Check out my practice on Noteshare';
      
      // Check if Web Share API is available and supports files
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'My Practice Session',
          text: shareText,
        });
        toast({ title: 'Shared successfully!' });
      } else if (navigator.share) {
        // Share without file (text only)
        await navigator.share({
          title: 'My Practice Session',
          text: shareText,
          url: window.location.href,
        });
        toast({ title: 'Shared successfully!' });
      } else {
        // Fallback: download and show message
        await handleDownload();
        toast({ 
          title: 'Image saved!', 
          description: 'Share it manually to your favorite app' 
        });
      }
    } catch (err) {
      // User cancelled share or error occurred
      if ((err as Error).name !== 'AbortError') {
        console.error('Share error:', err);
        toast({ 
          title: 'Could not share', 
          description: 'Image has been saved instead',
          variant: 'destructive' 
        });
        await handleDownload();
      }
    } finally {
      setIsExporting(false);
    }
  }, [generateImage, handleDownload, toast]);

  const handleInstagramShare = useCallback(async () => {
    // Instagram Stories can be shared via Web Share API on iOS
    // or users can copy image to clipboard and paste in Instagram
    setIsExporting(true);
    try {
      const blob = await generateImage();
      if (!blob) throw new Error('Failed to generate image');
      
      const file = new File([blob], 'noteshare-practice.png', { type: 'image/png' });
      
      // Try native share first (works on iOS with Instagram installed)
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
        });
        toast({ title: 'Opening share menu...' });
      } else {
        // Fallback: download and instruct
        await handleDownload();
        toast({ 
          title: 'Image saved!', 
          description: 'Open Instagram and share from your photo library' 
        });
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        await handleDownload();
        toast({ 
          title: 'Image saved!', 
          description: 'Open Instagram and share from your photo library' 
        });
      }
    } finally {
      setIsExporting(false);
    }
  }, [generateImage, handleDownload, toast]);

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

          {/* Audio Selection */}
          {audioFiles.length > 0 && (
            <div>
              <Label className="text-sm text-muted-foreground mb-2 block">
                Audio to display on card
              </Label>
              <div className="space-y-2">
                {audioFiles.map((audio) => (
                  <div key={audio.index} className="flex items-center gap-2">
                    <Checkbox
                      id={`audio-${audio.index}`}
                      checked={audioToInclude.includes(audio.index)}
                      onCheckedChange={() => toggleAudio(audio.index)}
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
              <p className="text-xs text-muted-foreground mt-2">
                Note: Audio files will need to be shared separately via message
              </p>
            </div>
          )}

          {/* Share Actions */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button
              variant="outline"
              onClick={handleDownload}
              disabled={isExporting}
              className="flex items-center gap-2"
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Save Image
            </Button>
            
            <Button
              onClick={handleShare}
              disabled={isExporting}
              className="flex items-center gap-2 bg-gradient-primary"
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <MessageCircle className="w-4 h-4" />
              )}
              Share
            </Button>
          </div>

          <Button
            variant="outline"
            onClick={handleInstagramShare}
            disabled={isExporting}
            className="w-full flex items-center gap-2"
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Instagram className="w-4 h-4" />
            )}
            Share to Instagram Story
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
