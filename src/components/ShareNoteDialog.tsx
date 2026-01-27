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

// Maximum audio duration for sharing (3 minutes)
const MAX_AUDIO_DURATION_SECONDS = 180;

// Helper to trim and compress audio for sharing
// Trims to first 3 minutes and compresses using MediaRecorder
const trimAndCompressAudio = async (audioBlob: Blob): Promise<Blob | null> => {
  try {
    const audioContext = new AudioContext();
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    // Calculate trim duration (max 3 minutes)
    const originalDuration = audioBuffer.duration;
    const trimDuration = Math.min(originalDuration, MAX_AUDIO_DURATION_SECONDS);
    const trimSamples = Math.floor(trimDuration * audioBuffer.sampleRate);
    
    // Create trimmed buffer
    const trimmedBuffer = audioContext.createBuffer(
      audioBuffer.numberOfChannels,
      trimSamples,
      audioBuffer.sampleRate
    );
    
    // Copy audio data
    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const originalData = audioBuffer.getChannelData(channel);
      const trimmedData = trimmedBuffer.getChannelData(channel);
      for (let i = 0; i < trimSamples; i++) {
        trimmedData[i] = originalData[i];
      }
    }
    
    // Create offline context for rendering
    const offlineContext = new OfflineAudioContext(
      trimmedBuffer.numberOfChannels,
      trimmedBuffer.length,
      trimmedBuffer.sampleRate
    );
    
    const source = offlineContext.createBufferSource();
    source.buffer = trimmedBuffer;
    source.connect(offlineContext.destination);
    source.start(0);
    
    const renderedBuffer = await offlineContext.startRendering();
    
    // Convert to WAV (universally compatible, smaller than raw PCM)
    const wavBlob = audioBufferToWav(renderedBuffer);
    
    await audioContext.close();
    return wavBlob;
  } catch (err) {
    console.error('Error trimming/compressing audio:', err);
    return null;
  }
};

// Convert AudioBuffer to WAV blob (widely compatible format)
const audioBufferToWav = (buffer: AudioBuffer): Blob => {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  
  // Interleave channels
  const interleaved = new Float32Array(buffer.length * numChannels);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < buffer.length; i++) {
      interleaved[i * numChannels + channel] = channelData[i];
    }
  }
  
  // Convert to 16-bit PCM
  const dataLength = interleaved.length * bytesPerSample;
  const wavBuffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(wavBuffer);
  
  // WAV header
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };
  
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(36, 'data');
  view.setUint32(40, dataLength, true);
  
  // Write audio data
  let offset = 44;
  for (let i = 0; i < interleaved.length; i++) {
    const sample = Math.max(-1, Math.min(1, interleaved[i]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
    offset += 2;
  }
  
  return new Blob([wavBuffer], { type: 'audio/wav' });
};

// Helper to fetch, trim, and prepare audio file for sharing
// Uses the exact user-provided name for the audio file
const fetchAndPrepareAudio = async (signedUrl: string, userProvidedName: string): Promise<File | null> => {
  try {
    const response = await fetch(signedUrl);
    if (!response.ok) throw new Error('Failed to fetch audio');
    
    const originalBlob = await response.blob();
    
    // Trim and compress the audio
    const processedBlob = await trimAndCompressAudio(originalBlob);
    if (!processedBlob) {
      // Fallback: use original if processing fails
      // Keep user's exact name, just sanitize for filesystem and add extension
      const sanitizedName = userProvidedName.replace(/[<>:"/\\|?*]/g, '_').trim() || 'recording';
      return new File([originalBlob], `${sanitizedName}.m4a`, { type: 'audio/mp4' });
    }
    
    // Keep user's exact name, just sanitize for filesystem and add extension
    const sanitizedName = userProvidedName.replace(/[<>:"/\\|?*]/g, '_').trim() || 'recording';
    
    return new File([processedBlob], `${sanitizedName}.wav`, { type: 'audio/wav' });
  } catch (err) {
    console.error('Error fetching/preparing audio file:', err);
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
  
  // Track loading state for jammer avatars
  const [isLoadingAvatars, setIsLoadingAvatars] = useState(false);
  
  // Fetch, sign, and convert jammer avatars to base64 for html-to-image compatibility
  // CRITICAL: Only base64 avatars work with html-to-image export - signed URLs cause CORS failures
  useEffect(() => {
    const fetchAvatars = async () => {
      const friendsWithAvatars = selectedJammerIds
        .map(id => friends.find(f => f.id === id))
        .filter((f): f is NonNullable<typeof f> => f !== null && !!f.avatar);
      
      if (friendsWithAvatars.length === 0) {
        setJammerAvatars({});
        setIsLoadingAvatars(false);
        return;
      }
      
      setIsLoadingAvatars(true);
      
      // Use the existing getSignedUrls batch function
      const urlsToSign = friendsWithAvatars.map(f => f.avatar!);
      
      try {
        const signedUrlMap = await getSignedUrls(urlsToSign);
        
        // Map friend IDs to their base64 URLs for html-to-image compatibility
        // IMPORTANT: Only include successfully converted base64 avatars
        const avatarMap: Record<string, string> = {};
        
        await Promise.all(friendsWithAvatars.map(async (friend) => {
          const signedUrl = signedUrlMap.get(friend.avatar!);
          if (signedUrl) {
            // Convert to base64 to avoid CORS issues in html-to-image
            const base64 = await convertToBase64(signedUrl);
            if (base64) {
              avatarMap[friend.id] = base64;
            } else {
              // DO NOT fallback to signed URL - it will cause html-to-image to fail
              // Instead, this jammer will show initials fallback in the card
              console.warn(`[ShareNoteDialog] Could not convert avatar to base64 for ${friend.name}, will use initials`);
            }
          }
        }));
        
        setJammerAvatars(avatarMap);
      } catch (err) {
        console.error('[ShareNoteDialog] Failed to get signed URLs:', err);
        setJammerAvatars({});
      } finally {
        setIsLoadingAvatars(false);
      }
    };
    
    if (selectedJammerIds.length > 0) {
      fetchAvatars();
    } else {
      setJammerAvatars({});
      setIsLoadingAvatars(false);
    }
  }, [selectedJammerIds, friends]);
  
  const selectedJammers: JammerInfo[] = useMemo(() => {
    return selectedJammerIds
      .map(id => {
        const friend = friends.find(f => f.id === id);
        if (!friend) return null;
        // ONLY use base64 avatar - if not available, pass undefined so card shows initials
        // This prevents CORS errors in html-to-image export
        const avatar = jammerAvatars[id]; // Intentionally NOT falling back to friend.avatar
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
      // Wait for avatars to finish loading if any jammers selected
      if (isLoadingAvatars) {
        console.log('[ShareNoteDialog] Waiting for avatars to finish loading...');
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Ensure element is fully visible and rendered
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Use html-to-image for pixel-perfect capture of the rendered DOM
      // filter out any external images that aren't base64 to prevent CORS errors
      const dataUrl = await toPng(cardRef.current, {
        quality: 1.0,
        pixelRatio: 3, // Higher resolution
        cacheBust: true,
        // Skip images that might cause CORS issues (non-base64)
        filter: (node) => {
          if (node instanceof HTMLImageElement) {
            const src = node.src || '';
            // Allow base64 data URLs and empty/placeholder images
            if (src.startsWith('data:') || !src || src.includes('dicebear')) {
              return true;
            }
            // Block external URLs that could cause CORS issues
            if (src.startsWith('http') && !src.startsWith('data:')) {
              console.warn('[ShareNoteDialog] Filtering out external image to prevent CORS:', src.substring(0, 100));
              return false;
            }
          }
          return true;
        },
      });
      
      // Convert data URL to blob
      const response = await fetch(dataUrl);
      return await response.blob();
    } catch (err) {
      console.error('[ShareNoteDialog] Error generating image:', err);
      return null;
    }
  }, [isLoadingAvatars]);

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
      
      // Start with image file
      const files: File[] = [imageFile];
      
      // Add audio file if selected (trimmed to 3 min, compressed)
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
              // Fetch, trim to 3 min, and compress the audio
              const audioFile = await fetchAndPrepareAudio(signedAudioUrl, rawName);
              if (audioFile) {
                files.push(audioFile);
              }
            }
          } catch (audioErr) {
            console.warn('Could not process audio for sharing:', audioErr);
            // Continue without audio
          }
        }
      }
      
      // Link to main Noteshare website
      // Use period trick to prevent Apple rich link preview: .URL.
      const shareText = `Check out my session on Noteshare\n\n.https://notesharemusic.com.`;
      
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
  }, [generateImage, handleDownload, toast, note.id, audioToInclude, note.audio_files, note.audio_file_names, isExporting]);

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

          {/* Share Actions - Two buttons */}
          <div className="grid grid-cols-2 gap-2 pt-2">
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

            {/* Save Image - Available everywhere, shows both Download and Instagram icons */}
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
                <div className="flex items-center gap-1">
                  <Download className="w-3.5 h-3.5" />
                  <Instagram className="w-3.5 h-3.5" />
                </div>
              )}
              <span className="hidden xs:inline">Save</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
