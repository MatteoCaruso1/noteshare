import { useState, useRef } from 'react';
import { 
  Disc3, Music, Guitar, Piano, Mic, Headphones, Radio, 
  Music2, Music3, Music4, Drum, AudioLines, Volume2, Upload,
  Speaker, Waves, ListMusic, KeyboardMusic, FolderOpen,
  MicVocal, AudioWaveform, Landmark, Building2,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SignedImage } from '@/components/SignedImage';

// 24 instrument/music icons in a 4x6 grid
const ICON_OPTIONS = [
  { id: 'disc', Icon: Disc3, label: 'Vinyl' },
  { id: 'music', Icon: Music, label: 'Note' },
  { id: 'guitar', Icon: Guitar, label: 'Guitar' },
  { id: 'piano', Icon: Piano, label: 'Piano' },
  { id: 'mic', Icon: Mic, label: 'Mic' },
  { id: 'headphones', Icon: Headphones, label: 'Phones' },
  { id: 'radio', Icon: Radio, label: 'Radio' },
  { id: 'music2', Icon: Music2, label: 'Notes' },
  { id: 'music4', Icon: Music4, label: 'Beam' },
  { id: 'drum', Icon: Drum, label: 'Drum' },
  { id: 'audiolines', Icon: AudioLines, label: 'Waves' },
  { id: 'volume', Icon: Volume2, label: 'Sound' },
  { id: 'speaker', Icon: Speaker, label: 'Speaker' },
  { id: 'music3', Icon: Music3, label: 'Triple' },
  { id: 'waves', Icon: Waves, label: 'Ocean' },
  { id: 'playlist', Icon: ListMusic, label: 'Playlist' },
  { id: 'keyboard', Icon: KeyboardMusic, label: 'Keys' },
  { id: 'micvocal', Icon: MicVocal, label: 'Vocal' },
  { id: 'waveform', Icon: AudioWaveform, label: 'Waveform' },
  { id: 'venue', Icon: Landmark, label: 'Venue' },
  { id: 'building', Icon: Building2, label: 'Building' },
  { id: 'micvocal2', Icon: MicVocal, label: 'Vocal 2' },
  { id: 'disc2', Icon: Disc3, label: 'Record' },
  { id: 'mic2', Icon: Mic, label: 'Mic 2' },
] as const;

// Color palette for icons
const COLOR_OPTIONS = [
  { id: 'blue', bg: 'bg-blue-500', label: 'Blue' },
  { id: 'indigo', bg: 'bg-indigo-500', label: 'Indigo' },
  { id: 'violet', bg: 'bg-violet-500', label: 'Violet' },
  { id: 'purple', bg: 'bg-purple-500', label: 'Purple' },
  { id: 'rose', bg: 'bg-rose-500', label: 'Rose' },
  { id: 'red', bg: 'bg-red-500', label: 'Red' },
  { id: 'orange', bg: 'bg-orange-500', label: 'Orange' },
  { id: 'amber', bg: 'bg-amber-500', label: 'Amber' },
  { id: 'emerald', bg: 'bg-emerald-500', label: 'Emerald' },
  { id: 'teal', bg: 'bg-teal-500', label: 'Teal' },
  { id: 'cyan', bg: 'bg-cyan-500', label: 'Cyan' },
  { id: 'sky', bg: 'bg-sky-500', label: 'Sky' },
  { id: 'slate', bg: 'bg-slate-600', label: 'Slate' },
  { id: 'zinc', bg: 'bg-zinc-600', label: 'Zinc' },
] as const;

type ColorId = typeof COLOR_OPTIONS[number]['id'];
type IconId = typeof ICON_OPTIONS[number]['id'];

// Map from old preset IDs to new icon:color format for backward compat
const LEGACY_MAP: Record<string, { iconId: string; colorId: ColorId }> = {
  'disc-purple': { iconId: 'disc', colorId: 'blue' },
  'music-blue': { iconId: 'music', colorId: 'indigo' },
  'guitar-orange': { iconId: 'guitar', colorId: 'slate' },
  'piano-emerald': { iconId: 'piano', colorId: 'violet' },
  'mic-pink': { iconId: 'mic', colorId: 'purple' },
  'headphones-cyan': { iconId: 'headphones', colorId: 'sky' },
  'radio-amber': { iconId: 'radio', colorId: 'zinc' },
  'music2-rose': { iconId: 'music2', colorId: 'blue' },
  'music4-indigo': { iconId: 'music4', colorId: 'cyan' },
  'drum-red': { iconId: 'drum', colorId: 'slate' },
  'waves-teal': { iconId: 'audiolines', colorId: 'indigo' },
  'volume-violet': { iconId: 'volume', colorId: 'purple' },
  'speaker-blue': { iconId: 'speaker', colorId: 'blue' },
  'music3-violet': { iconId: 'music3', colorId: 'violet' },
  'ocean-sky': { iconId: 'waves', colorId: 'sky' },
  'playlist-indigo': { iconId: 'playlist', colorId: 'indigo' },
  'keyboard-slate': { iconId: 'keyboard', colorId: 'slate' },
};

function parseIconValue(value: string | null): { iconId: string | null; colorId: ColorId } {
  if (!value || !value.startsWith('icon:')) return { iconId: null, colorId: 'blue' };
  const parts = value.replace('icon:', '').split(':');
  
  // New format: icon:guitar:rose
  if (parts.length === 2) {
    return { iconId: parts[0], colorId: (parts[1] as ColorId) || 'blue' };
  }
  
  // Legacy format: icon:disc-purple
  const legacy = LEGACY_MAP[parts[0]];
  if (legacy) return legacy;
  
  return { iconId: parts[0], colorId: 'blue' };
}

function getColorBg(colorId: string): string {
  return COLOR_OPTIONS.find(c => c.id === colorId)?.bg || 'bg-blue-500';
}

function getIconComponent(iconId: string) {
  return ICON_OPTIONS.find(i => i.id === iconId);
}

// Keep old PRESET_ICONS export for backward compat in other files
const PRESET_ICONS = ICON_OPTIONS.map(icon => ({
  id: icon.id,
  Icon: icon.Icon,
  bgClass: 'bg-blue-500',
  label: icon.label,
}));

export type PresetIconId = string;

interface ProjectCoverPickerProps {
  value: string | null;
  onChange: (value: string | null) => void;
  profileId: string;
  previewUrl?: string | null;
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

  const parsed = parseIconValue(value);
  const isPresetIcon = value?.startsWith('icon:');
  const selectedIcon = parsed.iconId ? getIconComponent(parsed.iconId) : null;
  const selectedColorBg = getColorBg(parsed.colorId);

  // Local state for picker
  const [pickerIconId, setPickerIconId] = useState<string | null>(parsed.iconId);
  const [pickerColorId, setPickerColorId] = useState<ColorId>(parsed.colorId);

  const handleOpenPicker = () => {
    const p = parseIconValue(value);
    setPickerIconId(p.iconId);
    setPickerColorId(p.colorId);
    setShowPicker(!showPicker);
  };

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

  const handleIconSelect = (iconId: string) => {
    setPickerIconId(iconId);
    // Immediately save with current color
    onChange(`icon:${iconId}:${pickerColorId}`);
    onPreviewUrlChange?.(null);
  };

  const handleColorSelect = (colorId: ColorId) => {
    setPickerColorId(colorId);
    // If an icon is selected, update with new color
    if (pickerIconId) {
      onChange(`icon:${pickerIconId}:${colorId}`);
      onPreviewUrlChange?.(null);
    }
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
        onClick={handleOpenPicker}
      >
        {isUploading ? (
          <div className="text-xs text-muted-foreground">Uploading...</div>
        ) : selectedIcon && isPresetIcon ? (
          <div className={cn("w-full h-full flex items-center justify-center", selectedColorBg)}>
            <selectedIcon.Icon className={cn(iconSizeClasses, "text-white")} />
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
        <div className="w-full max-w-[300px] p-3 bg-card border border-border rounded-lg shadow-lg space-y-3">
          <p className="text-xs text-muted-foreground text-center">Choose an icon & color</p>
          
          {/* Color Picker Row */}
          <div className="flex flex-wrap gap-1.5 justify-center">
            {COLOR_OPTIONS.map((color) => (
              <button
                key={color.id}
                type="button"
                onClick={() => handleColorSelect(color.id)}
                className={cn(
                  "w-6 h-6 rounded-full transition-all relative",
                  color.bg,
                  pickerColorId === color.id && "ring-2 ring-offset-2 ring-offset-background ring-primary scale-110"
                )}
                title={color.label}
              >
                {pickerColorId === color.id && (
                  <Check className="w-3 h-3 text-white absolute inset-0 m-auto" />
                )}
              </button>
            ))}
          </div>

          {/* Icon Grid - 4 rows of 6 */}
          <div className="grid grid-cols-6 gap-2">
            {ICON_OPTIONS.map((icon) => {
              const isSelected = pickerIconId === icon.id;
              const bgClass = isSelected ? getColorBg(pickerColorId) : 'bg-secondary';
              return (
                <button
                  key={icon.id}
                  type="button"
                  onClick={() => handleIconSelect(icon.id)}
                  className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center transition-all",
                    bgClass,
                    isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                  )}
                  title={icon.label}
                >
                  <icon.Icon className={cn("w-5 h-5", isSelected ? "text-white" : "text-muted-foreground")} />
                </button>
              );
            })}
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
  iconClassName = "w-9 h-9"
}: { 
  value: string | null | undefined; 
  className?: string;
  iconClassName?: string;
}) {
  if (!value) {
    return (
      <div className={cn("rounded-lg bg-secondary flex items-center justify-center", className)}>
        <FolderOpen className={cn(iconClassName, "text-muted-foreground")} />
      </div>
    );
  }

  if (value.startsWith('icon:')) {
    const parsed = parseIconValue(value);
    const icon = parsed.iconId ? getIconComponent(parsed.iconId) : null;
    const colorBg = getColorBg(parsed.colorId);
    
    if (icon) {
      return (
        <div className={cn("rounded-lg flex items-center justify-center", className, colorBg)}>
          <icon.Icon className={cn(iconClassName, "text-white")} />
        </div>
      );
    }
  }

  return (
    <SignedImage src={value} alt="" className={cn("rounded-lg object-cover", className)} />
  );
}

export { PRESET_ICONS, ICON_OPTIONS, COLOR_OPTIONS, parseIconValue, getColorBg, getIconComponent };
