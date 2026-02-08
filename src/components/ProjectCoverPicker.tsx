import { useState, useRef } from 'react';
import { 
  Disc3, Music, Guitar, Piano, Mic, Headphones, Radio, 
  Music2, Music4, Drum, AudioLines, Volume2, Upload 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SignedImage } from '@/components/SignedImage';

// Preset icons with their associated colors
const PRESET_ICONS = [
  { id: 'disc-purple', Icon: Disc3, bgClass: 'bg-purple-500', label: 'Vinyl' },
  { id: 'music-blue', Icon: Music, bgClass: 'bg-blue-500', label: 'Note' },
  { id: 'guitar-orange', Icon: Guitar, bgClass: 'bg-orange-500', label: 'Guitar' },
  { id: 'piano-emerald', Icon: Piano, bgClass: 'bg-emerald-500', label: 'Piano' },
  { id: 'mic-pink', Icon: Mic, bgClass: 'bg-pink-500', label: 'Mic' },
  { id: 'headphones-cyan', Icon: Headphones, bgClass: 'bg-cyan-500', label: 'Phones' },
  { id: 'radio-amber', Icon: Radio, bgClass: 'bg-amber-500', label: 'Radio' },
  { id: 'music2-rose', Icon: Music2, bgClass: 'bg-rose-500', label: 'Notes' },
  { id: 'music4-indigo', Icon: Music4, bgClass: 'bg-indigo-500', label: 'Beam' },
  { id: 'drum-red', Icon: Drum, bgClass: 'bg-red-500', label: 'Drum' },
  { id: 'waves-teal', Icon: AudioLines, bgClass: 'bg-teal-500', label: 'Waves' },
  { id: 'volume-violet', Icon: Volume2, bgClass: 'bg-violet-500', label: 'Sound' },
] as const;

export type PresetIconId = typeof PRESET_ICONS[number]['id'];

interface ProjectCoverPickerProps {
  value: string | null; // Can be a preset ID like "icon:disc-purple" or a storage path
  onChange: (value: string | null) => void;
  profileId: string;
  previewUrl?: string | null; // For uploaded images, pass the signed URL for preview
  onPreviewUrlChange?: (url: string | null) => void;
  size?: 'sm' | 'md';
}

export function ProjectCoverPicker({ 
  value, 
  onChange, 
  profileId,
  previewUrl,
  onPreviewUrlChange,
  size = 'md'
}: ProjectCoverPickerProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isPresetIcon = value?.startsWith('icon:');
  const presetId = isPresetIcon ? value.replace('icon:', '') : null;
  const selectedPreset = PRESET_ICONS.find(p => p.id === presetId);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profileId) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${profileId}/project-covers/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('practice-media')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get signed URL for preview
      const { data: signedData, error: signedError } = await supabase.storage
        .from('practice-media')
        .createSignedUrl(filePath, 60 * 60);

      if (signedError) throw signedError;

      onChange(filePath);
      onPreviewUrlChange?.(signedData.signedUrl);
      setShowPicker(false);
      toast.success('Album art uploaded!');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const handlePresetSelect = (preset: typeof PRESET_ICONS[number]) => {
    onChange(`icon:${preset.id}`);
    onPreviewUrlChange?.(null);
    setShowPicker(false);
  };

  const sizeClasses = size === 'sm' ? 'w-16 h-16' : 'w-24 h-24';
  const iconSizeClasses = size === 'sm' ? 'w-6 h-6' : 'w-8 h-8';
  const smallIconClasses = size === 'sm' ? 'w-4 h-4' : 'w-6 h-6';

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Current Selection Display */}
      <div
        className={cn(
          "rounded-lg flex items-center justify-center cursor-pointer transition-colors overflow-hidden",
          sizeClasses,
          !value && "bg-secondary hover:bg-secondary/80"
        )}
        onClick={() => setShowPicker(!showPicker)}
      >
        {isUploading ? (
          <div className="text-xs text-muted-foreground">Uploading...</div>
        ) : selectedPreset ? (
          <div className={cn("w-full h-full flex items-center justify-center", selectedPreset.bgClass)}>
            <selectedPreset.Icon className={cn(iconSizeClasses, "text-white")} />
          </div>
        ) : value && !isPresetIcon ? (
          previewUrl ? (
            <img src={previewUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <SignedImage src={value} alt="" className="w-full h-full object-cover" />
          )
        ) : (
          <div className="flex flex-col items-center gap-1">
            <Upload className={cn(smallIconClasses, "text-muted-foreground")} />
            <span className="text-xs text-muted-foreground">Add Image</span>
          </div>
        )}
      </div>
      
      {/* Hint text */}
      <p className="text-xs text-muted-foreground">Optional cover image or icon</p>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />

      {/* Picker Panel */}
      {showPicker && (
        <div className="w-full max-w-[280px] p-3 bg-card border border-border rounded-lg shadow-lg space-y-3">
          <p className="text-xs text-muted-foreground text-center">Choose an icon or upload art</p>
          
          {/* Preset Icons Grid */}
          <div className="grid grid-cols-6 gap-2">
            {PRESET_ICONS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handlePresetSelect(preset)}
                className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center transition-all",
                  preset.bgClass,
                  presetId === preset.id && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                )}
                title={preset.label}
              >
                <preset.Icon className="w-5 h-5 text-white" />
              </button>
            ))}
          </div>

          {/* Upload Option */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="w-full py-2 px-3 rounded-lg border border-dashed border-border hover:border-primary/50 hover:bg-secondary/50 transition-colors flex items-center justify-center gap-2 text-sm text-muted-foreground"
          >
            <Upload className="w-4 h-4" />
            {isUploading ? 'Uploading...' : 'Upload custom art'}
          </button>

          {/* Clear Option */}
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange(null);
                onPreviewUrlChange?.(null);
                setShowPicker(false);
              }}
              className="w-full py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Remove cover
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Helper to render a project cover (icon or image) in display contexts
export function ProjectCover({ 
  value, 
  className = "w-16 h-16",
  iconClassName = "w-6 h-6"
}: { 
  value: string | null | undefined; 
  className?: string;
  iconClassName?: string;
}) {
  if (!value) {
    return (
      <div className={cn("rounded-lg bg-secondary flex items-center justify-center", className)}>
        <Disc3 className={cn(iconClassName, "text-muted-foreground")} />
      </div>
    );
  }

  if (value.startsWith('icon:')) {
    const presetId = value.replace('icon:', '');
    const preset = PRESET_ICONS.find(p => p.id === presetId);
    
    if (preset) {
      return (
        <div className={cn("rounded-lg flex items-center justify-center", className, preset.bgClass)}>
          <preset.Icon className={cn(iconClassName, "text-white")} />
        </div>
      );
    }
  }

  // It's an image path
  return (
    <SignedImage src={value} alt="" className={cn("rounded-lg object-cover", className)} />
  );
}

export { PRESET_ICONS };
