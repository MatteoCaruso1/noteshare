import { Check } from 'lucide-react';
import {
  useBackgroundCustomization,
  AVAILABLE_PACKS,
  DENSITY_OPTIONS,
} from '@/contexts/BackgroundCustomizationContext';
import { cn } from '@/lib/utils';

export function BackgroundPackPicker() {
  const { pack, density, setPack, setDensity, isLoading } = useBackgroundCustomization();

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {AVAILABLE_PACKS.map((p) => (
            <div key={p.id} className="w-12 h-12 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Background Pack</p>
        <div className="flex flex-wrap gap-2">
          {AVAILABLE_PACKS.map((option) => {
            const isSelected = pack === option.id;
            return (
              <button
                key={option.id}
                onClick={() => setPack(option.id)}
                className={cn(
                  'relative w-12 h-12 rounded-lg border bg-muted/40 flex items-center justify-center text-2xl',
                  'transition-all duration-150 hover:bg-muted',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ring-offset-background',
                  isSelected ? 'border-primary ring-2 ring-primary' : 'border-border'
                )}
                title={option.name}
                aria-label={`Select ${option.name} pack`}
                aria-pressed={isSelected}
              >
                <span className="emoji-text leading-none">{option.emoji}</span>
                {isSelected && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-primary-foreground" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">Animation Density</p>
        <div className="inline-flex rounded-lg border border-border bg-muted/40 p-1 gap-1">
          {DENSITY_OPTIONS.map((opt) => {
            const isSelected = density === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => setDensity(opt.id)}
                className={cn(
                  'px-3 py-1 text-xs font-medium rounded-md transition-colors',
                  isSelected
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
                aria-pressed={isSelected}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
