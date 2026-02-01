import { Check } from 'lucide-react';
import { useColorTheme, AVAILABLE_THEMES, ColorTheme } from '@/contexts/ColorThemeContext';
import { cn } from '@/lib/utils';

export function ThemePicker() {
  const { colorTheme, setColorTheme, isLoading } = useColorTheme();

  if (isLoading) {
    return (
      <div className="flex gap-2">
        {AVAILABLE_THEMES.map((theme) => (
          <div
            key={theme.id}
            className="w-8 h-8 rounded-full bg-muted animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">Color Theme</p>
      <div className="flex flex-wrap gap-3">
        {AVAILABLE_THEMES.map((theme) => {
          const isSelected = colorTheme === theme.id;
          return (
            <button
              key={theme.id}
              onClick={() => setColorTheme(theme.id)}
              className={cn(
                "w-9 h-9 rounded-full relative transition-all duration-200",
                "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                isSelected && "ring-2 ring-offset-2"
              )}
              style={{
                backgroundColor: `hsl(${theme.previewColor})`,
                // Use the theme's own color for the ring when selected
                ...(isSelected && { '--tw-ring-color': `hsl(${theme.previewColor})` } as React.CSSProperties),
              }}
              title={theme.name}
              aria-label={`Select ${theme.name} theme`}
              aria-pressed={isSelected}
            >
              {isSelected && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <Check className="w-4 h-4 text-white drop-shadow-sm" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
