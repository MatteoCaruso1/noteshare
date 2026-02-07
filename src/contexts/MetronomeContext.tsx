import { createContext, useContext, useState, useRef, useCallback, useEffect, ReactNode } from 'react';

interface MetronomeContextType {
  isPlaying: boolean;
  bpm: number;
  setBpm: (bpm: number) => void;
  toggleMetronome: () => Promise<void>;
  stopMetronome: () => void;
}

const MetronomeContext = createContext<MetronomeContextType | null>(null);

export function MetronomeProvider({ children }: { children: ReactNode }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(120);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextTickTimeRef = useRef<number>(0);
  const schedulerTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Schedule a click at an exact time using Web Audio API's precise timing
  const scheduleClick = useCallback((time: number) => {
    const ctx = audioContextRef.current;
    if (!ctx) return;
    
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    // Short, punchy click sound at 1000Hz
    oscillator.frequency.value = 1000;
    oscillator.type = 'sine';
    
    // Schedule gain envelope at the EXACT scheduled time (not "now")
    gainNode.gain.setValueAtTime(0.3, time);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
    
    // Start and stop at precise times
    oscillator.start(time);
    oscillator.stop(time + 0.05);
  }, []);
  
  // Lookahead scheduler - schedules clicks ahead of time for sample-accurate timing
  const runScheduler = useCallback(() => {
    const ctx = audioContextRef.current;
    if (!ctx) return;
    
    const secondsPerBeat = 60.0 / bpm;
    const lookahead = 0.1; // Schedule 100ms ahead
    
    // Schedule all clicks that fall within our lookahead window
    while (nextTickTimeRef.current < ctx.currentTime + lookahead) {
      // Only schedule if the time is in the future (or very close to now)
      if (nextTickTimeRef.current >= ctx.currentTime - 0.01) {
        scheduleClick(nextTickTimeRef.current);
      }
      nextTickTimeRef.current += secondsPerBeat;
    }
  }, [bpm, scheduleClick]);
  
  // Start/stop metronome
  useEffect(() => {
    if (isPlaying) {
      // AudioContext is already created and resumed in toggleMetronome (user gesture)
      const ctx = audioContextRef.current;
      if (!ctx) return;
      
      // Start scheduling from now
      nextTickTimeRef.current = ctx.currentTime;
      
      // Run scheduler immediately, then every 25ms
      runScheduler();
      schedulerTimerRef.current = setInterval(runScheduler, 25);
    } else {
      // Stop the scheduler
      if (schedulerTimerRef.current) {
        clearInterval(schedulerTimerRef.current);
        schedulerTimerRef.current = null;
      }
    }
    
    return () => {
      if (schedulerTimerRef.current) {
        clearInterval(schedulerTimerRef.current);
        schedulerTimerRef.current = null;
      }
    };
  }, [isPlaying, runScheduler]);
  
  // Cleanup audio context on unmount
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);
  
  const toggleMetronome = async () => {
    if (!isPlaying) {
      // Create AudioContext on user gesture (required for mobile)
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
      
      const ctx = audioContextRef.current;
      
      // Resume if suspended - MUST happen in click handler for mobile
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      
      // Play a silent buffer to fully unlock audio on iOS
      const buffer = ctx.createBuffer(1, 1, 22050);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
    }
    
    setIsPlaying(!isPlaying);
  };

  const stopMetronome = () => {
    setIsPlaying(false);
  };

  return (
    <MetronomeContext.Provider value={{
      isPlaying,
      bpm,
      setBpm,
      toggleMetronome,
      stopMetronome,
    }}>
      {children}
    </MetronomeContext.Provider>
  );
}

export function useMetronome() {
  const context = useContext(MetronomeContext);
  if (!context) {
    throw new Error('useMetronome must be used within a MetronomeProvider');
  }
  return context;
}
