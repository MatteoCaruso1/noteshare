import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export type ColorTheme = 'blue' | 'red' | 'purple' | 'green' | 'amber' | 'teal';

export interface ThemeOption {
  id: ColorTheme;
  name: string;
  // Preview color in HSL format for the swatch
  previewColor: string;
}

export const AVAILABLE_THEMES: ThemeOption[] = [
  { id: 'blue', name: 'Ocean Blue', previewColor: '200 98% 39%' },
  { id: 'red', name: 'Coral Red', previewColor: '0 72% 50%' },
  { id: 'purple', name: 'Creative Purple', previewColor: '265 55% 55%' },
  { id: 'green', name: 'Forest Green', previewColor: '145 55% 42%' },
  { id: 'amber', name: 'Golden Amber', previewColor: '38 92% 50%' },
  { id: 'teal', name: 'Calm Teal', previewColor: '175 60% 40%' },
];

interface ColorThemeContextType {
  colorTheme: ColorTheme;
  setColorTheme: (theme: ColorTheme) => Promise<void>;
  availableThemes: ThemeOption[];
  isLoading: boolean;
}

const ColorThemeContext = createContext<ColorThemeContextType | undefined>(undefined);

export function ColorThemeProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const [colorTheme, setColorThemeState] = useState<ColorTheme>('blue');
  const [isLoading, setIsLoading] = useState(true);

  // Load theme from profile on mount
  useEffect(() => {
    if (profile) {
      const savedTheme = profile.color_theme as ColorTheme | undefined;
      if (savedTheme && AVAILABLE_THEMES.some(t => t.id === savedTheme)) {
        setColorThemeState(savedTheme);
      } else {
        setColorThemeState('blue');
      }
      setIsLoading(false);
    } else {
      // No profile yet, use default
      setColorThemeState('blue');
      setIsLoading(false);
    }
  }, [profile]);

  // Apply theme class to document root
  useEffect(() => {
    const root = document.documentElement;
    
    // Remove all theme classes
    AVAILABLE_THEMES.forEach(theme => {
      root.classList.remove(`theme-${theme.id}`);
    });
    
    // Add current theme class (skip for default blue)
    if (colorTheme !== 'blue') {
      root.classList.add(`theme-${colorTheme}`);
    }
  }, [colorTheme]);

  const setColorTheme = useCallback(async (theme: ColorTheme) => {
    if (!profile) return;
    
    // Optimistic update
    setColorThemeState(theme);
    
    // Persist to database
    const { error } = await supabase
      .from('profiles')
      .update({ color_theme: theme })
      .eq('id', profile.id);
    
    if (error) {
      console.error('Failed to save color theme:', error);
      // Revert on error
      const savedTheme = profile.color_theme as ColorTheme | undefined;
      setColorThemeState(savedTheme || 'blue');
    }
  }, [profile]);

  return (
    <ColorThemeContext.Provider value={{
      colorTheme,
      setColorTheme,
      availableThemes: AVAILABLE_THEMES,
      isLoading,
    }}>
      {children}
    </ColorThemeContext.Provider>
  );
}

export function useColorTheme() {
  const context = useContext(ColorThemeContext);
  if (context === undefined) {
    throw new Error('useColorTheme must be used within a ColorThemeProvider');
  }
  return context;
}
