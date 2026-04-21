import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export type BackgroundPack = 'music' | 'stars' | 'hearts' | 'sparkles' | 'nature' | 'space' | 'none';
export type BackgroundDensity = 'off' | 'calm' | 'normal' | 'party';

export interface BackgroundPackOption {
  id: BackgroundPack;
  name: string;
  emoji: string;
  symbols: string[];
}

export const AVAILABLE_PACKS: BackgroundPackOption[] = [
  { id: 'music',    name: 'Music Notes', emoji: '🎵', symbols: ['♪', '♫', '♬', '♩', '𝄞', '♭', '♯', '𝄢'] },
  { id: 'stars',    name: 'Starlight',   emoji: '✨', symbols: ['★', '☆', '✦', '✧', '✩', '✪', '✫', '✬'] },
  { id: 'hearts',   name: 'Hearts',      emoji: '💖', symbols: ['♥', '♡', '❤', '💗', '💓', '💘', '💝', '🩷'] },
  { id: 'sparkles', name: 'Sparkles',    emoji: '🌟', symbols: ['✨', '⭐', '🌟', '💫', '⚡', '🔥', '☄', '✦'] },
  { id: 'nature',   name: 'Nature',      emoji: '🌿', symbols: ['🌿', '🍃', '🌱', '🌸', '🌺', '🍀', '🌷', '🌼'] },
  { id: 'space',    name: 'Cosmos',      emoji: '🪐', symbols: ['🪐', '🌌', '🌠', '☄', '🛸', '🌑', '🌙', '🔭'] },
  { id: 'none',     name: 'Minimal',     emoji: '🚫', symbols: [] },
];

export const DENSITY_OPTIONS: { id: BackgroundDensity; label: string; count: number }[] = [
  { id: 'off',    label: 'Off',    count: 0 },
  { id: 'calm',   label: 'Calm',   count: 5 },
  { id: 'normal', label: 'Normal', count: 9 },
  { id: 'party',  label: 'Party',  count: 18 },
];

export function getPackSymbols(pack: BackgroundPack): string[] {
  return AVAILABLE_PACKS.find(p => p.id === pack)?.symbols ?? AVAILABLE_PACKS[0].symbols;
}

export function getDensityCount(density: BackgroundDensity): number {
  return DENSITY_OPTIONS.find(d => d.id === density)?.count ?? 9;
}

interface BackgroundCustomizationContextType {
  pack: BackgroundPack;
  density: BackgroundDensity;
  setPack: (pack: BackgroundPack) => Promise<void>;
  setDensity: (density: BackgroundDensity) => Promise<void>;
  isLoading: boolean;
}

const BackgroundCustomizationContext = createContext<BackgroundCustomizationContextType | undefined>(undefined);

export function BackgroundCustomizationProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const [pack, setPackState] = useState<BackgroundPack>('music');
  const [density, setDensityState] = useState<BackgroundDensity>('normal');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      const savedPack = (profile as any).background_pack as BackgroundPack | undefined;
      const savedDensity = (profile as any).background_density as BackgroundDensity | undefined;
      if (savedPack && AVAILABLE_PACKS.some(p => p.id === savedPack)) setPackState(savedPack);
      if (savedDensity && DENSITY_OPTIONS.some(d => d.id === savedDensity)) setDensityState(savedDensity);
      setIsLoading(false);
    } else {
      setIsLoading(false);
    }
  }, [profile]);

  const setPack = useCallback(async (next: BackgroundPack) => {
    if (!profile) return;
    setPackState(next);
    const { error } = await supabase
      .from('profiles')
      .update({ background_pack: next } as any)
      .eq('id', profile.id);
    if (error) console.error('Failed to save background pack:', error);
  }, [profile]);

  const setDensity = useCallback(async (next: BackgroundDensity) => {
    if (!profile) return;
    setDensityState(next);
    const { error } = await supabase
      .from('profiles')
      .update({ background_density: next } as any)
      .eq('id', profile.id);
    if (error) console.error('Failed to save background density:', error);
  }, [profile]);

  return (
    <BackgroundCustomizationContext.Provider value={{ pack, density, setPack, setDensity, isLoading }}>
      {children}
    </BackgroundCustomizationContext.Provider>
  );
}

export function useBackgroundCustomization() {
  const ctx = useContext(BackgroundCustomizationContext);
  if (!ctx) throw new Error('useBackgroundCustomization must be used within BackgroundCustomizationProvider');
  return ctx;
}
