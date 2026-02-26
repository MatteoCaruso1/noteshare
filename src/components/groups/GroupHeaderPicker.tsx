import { useState, useRef } from 'react';
import { 
  Waves, Mountain, Sun, Sunset, Moon, Stars, 
  CloudSun, Sparkles, Zap, Flame, Heart, Music,
  Upload, X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SignedImage } from '@/components/SignedImage';

// Preset header backgrounds with gradient styles
const PRESET_HEADERS = [
  { id: 'gradient-ocean', label: 'Ocean', gradient: 'bg-gradient-to-br from-blue-600 via-cyan-500 to-teal-400', Icon: Waves },
  { id: 'gradient-sunset', label: 'Sunset', gradient: 'bg-gradient-to-br from-orange-500 via-rose-500 to-purple-600', Icon: Sunset },
  { id: 'gradient-aurora', label: 'Aurora', gradient: 'bg-gradient-to-br from-emerald-400 via-cyan-500 to-blue-600', Icon: Stars },
  { id: 'gradient-lavender', label: 'Lavender', gradient: 'bg-gradient-to-br from-purple-400 via-pink-400 to-rose-400', Icon: Sparkles },
  { id: 'gradient-midnight', label: 'Midnight', gradient: 'bg-gradient-to-br from-slate-900 via-purple-900 to-slate-800', Icon: Moon },
  { id: 'gradient-fire', label: 'Fire', gradient: 'bg-gradient-to-br from-yellow-400 via-orange-500 to-red-600', Icon: Flame },
  { id: 'gradient-forest', label: 'Forest', gradient: 'bg-gradient-to-br from-green-600 via-emerald-500 to-teal-500', Icon: Mountain },
  { id: 'gradient-sunrise', label: 'Sunrise', gradient: 'bg-gradient-to-br from-rose-300 via-pink-300 to-orange-300', Icon: Sun },
  { id: 'gradient-storm', label: 'Storm', gradient: 'bg-gradient-to-br from-slate-600 via-slate-700 to-slate-900', Icon: CloudSun },
  { id: 'gradient-electric', label: 'Electric', gradient: 'bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500', Icon: Zap },
  { id: 'gradient-warm', label: 'Warm', gradient: 'bg-gradient-to-br from-amber-400 via-orange-400 to-rose-400', Icon: Heart },
  { id: 'gradient-music', label: 'Music', gradient: 'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500', Icon: Music },
] as const;

export type PresetHeaderId = typeof PRESET_HEADERS[number]['id'];

// Helper to check if a value is a preset header
export function isPresetHeader(value: string | null | undefined): boolean {
  return value?.startsWith('header:') ?? false;
}

// Helper to get preset data from a header value
export function getPresetHeader(value: string | null | undefined) {
  if (!value?.startsWith('header:')) return null;
  const presetId = value.replace('header:', '');
  return PRESET_HEADERS.find(p => p.id === presetId) || null;
}

interface GroupHeaderPickerProps {
  value: string | null; // Can be "header:gradient-ocean" or a storage path
  onChange: (value: string | null) => void;
  profileId: string;
  previewUrl?: string | null;
  onPreviewUrlChange?: (url: string | null) => void;
}

export function GroupHeaderPicker({ 
  value, 
  onChange, 
  profileId,
  previewUrl,
  onPreviewUrlChange,
}: GroupHeaderPickerProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isPreset = value?.startsWith('header:');
  const presetId = isPreset ? value.replace('header:', '') : null;
  const selectedPreset = PRESET_HEADERS.find(p => p.id === presetId);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profileId) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${profileId}/group-headers/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('practice-media')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get signed URL via batched pipeline (no direct storage signing)
      const { getSignedUrls } = await import('@/hooks/useSignedUrl');
      const results = await getSignedUrls([filePath]);
      const signedUrl = results.get(filePath);

      onChange(filePath);
      onPreviewUrlChange?.(signedUrl || null);
      toast.success('Header image uploaded!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const handlePresetSelect = (preset: typeof PRESET_HEADERS[number]) => {
    onChange(`header:${preset.id}`);
    onPreviewUrlChange?.(null);
  };

  const handleClear = () => {
    onChange(null);
    onPreviewUrlChange?.(null);
  };

  // Determine what to display in the preview
  const hasCustomImage = value && !isPreset;
  const displayUrl = previewUrl || (hasCustomImage ? value : null);

  return (
    <div className="space-y-3">
      {/* Preview */}
      <div className="relative w-full aspect-[3/1] rounded-lg overflow-hidden">
        {isUploading ? (
          <div className="w-full h-full bg-secondary flex items-center justify-center">
            <span className="text-sm text-muted-foreground">Uploading...</span>
          </div>
        ) : selectedPreset ? (
          <div className={cn("w-full h-full", selectedPreset.gradient)} />
        ) : displayUrl ? (
          previewUrl ? (
            <img src={previewUrl} alt="Header preview" className="w-full h-full object-cover" />
          ) : (
            <SignedImage src={value!} alt="Header" className="w-full h-full object-cover" />
          )
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary flex items-center justify-center">
            <span className="text-sm text-muted-foreground">No header selected</span>
          </div>
        )}
        
        {/* Clear button */}
        {value && (
          <button
            onClick={handleClear}
            className="absolute top-2 right-2 w-6 h-6 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center hover:bg-background transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />

      {/* Preset Grid */}
      <div className="grid grid-cols-6 gap-2">
        {PRESET_HEADERS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => handlePresetSelect(preset)}
            className={cn(
              "aspect-[3/2] rounded-md overflow-hidden transition-all",
              preset.gradient,
              presetId === preset.id && "ring-2 ring-primary ring-offset-2 ring-offset-background"
            )}
            title={preset.label}
          />
        ))}
      </div>

      {/* Upload Option */}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className="w-full py-2.5 px-3 rounded-lg border border-dashed border-border hover:border-primary/50 hover:bg-secondary/50 transition-colors flex items-center justify-center gap-2 text-sm text-muted-foreground"
      >
        <Upload className="w-4 h-4" />
        {isUploading ? 'Uploading...' : 'Upload custom image'}
      </button>
    </div>
  );
}

// Helper to render a group header (preset or image) in display contexts
export function GroupHeader({ 
  value, 
  className = "h-48",
}: { 
  value: string | null | undefined; 
  className?: string;
}) {
  const preset = getPresetHeader(value);
  
  if (preset) {
    return <div className={cn("w-full", className, preset.gradient)} />;
  }
  
  if (value && !value.startsWith('header:')) {
    return (
      <SignedImage 
        src={value} 
        alt="" 
        className={cn("w-full object-cover", className)} 
      />
    );
  }

  // Default gradient
  return <div className={cn("w-full bg-gradient-to-br from-primary/20 to-secondary", className)} />;
}

export { PRESET_HEADERS };
