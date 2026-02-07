import { createContext, useContext, useState, useRef, useCallback, useEffect, ReactNode } from 'react';

interface PracticeTimerContextType {
  isRunning: boolean;
  isPaused: boolean;
  remainingSeconds: number;
  inputValue: string;
  selectedMinutes: number;
  isValidInput: boolean;
  showComplete: boolean;
  setInputValue: (value: string) => void;
  setShowComplete: (show: boolean) => void;
  startTimer: () => Promise<void>;
  pauseTimer: () => void;
  resumeTimer: () => void;
  endTimer: () => void;
  formatTime: (seconds: number) => string;
  progressPercent: number;
}

const PracticeTimerContext = createContext<PracticeTimerContextType | null>(null);

export function PracticeTimerProvider({ children }: { children: ReactNode }) {
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [inputValue, setInputValue] = useState('15');
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [showComplete, setShowComplete] = useState(false);
  
  // Parse input to get valid minutes (0 if invalid/empty)
  const selectedMinutes = parseInt(inputValue, 10) || 0;
  const isValidInput = inputValue.trim() !== '' && selectedMinutes > 0 && selectedMinutes <= 180;
  
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  
  // Play completion sound - AudioContext is already unlocked from startTimer
  const playCompleteSound = useCallback(() => {
    const ctx = audioContextRef.current;
    if (!ctx) return;
    
    // Resume just in case (shouldn't be needed, but safe)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    
    // Play a pleasant completion chime (three tones)
    const playTone = (freq: number, startTime: number) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.frequency.value = freq;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.2, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.5);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + 0.5);
    };
    
    const now = ctx.currentTime;
    playTone(523, now);       // C5
    playTone(659, now + 0.15); // E5
    playTone(784, now + 0.3);  // G5
  }, []);
  
  // Timer countdown
  useEffect(() => {
    if (isRunning && !isPaused && remainingSeconds > 0) {
      intervalRef.current = setInterval(() => {
        setRemainingSeconds(prev => {
          if (prev <= 1) {
            setIsRunning(false);
            setIsPaused(false);
            setShowComplete(true);
            playCompleteSound();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, isPaused, remainingSeconds, playCompleteSound]);
  
  // Cleanup audio context
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);
  
  const startTimer = async () => {
    // Create and unlock AudioContext on user gesture (required for mobile)
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
    
    setRemainingSeconds(selectedMinutes * 60);
    setIsRunning(true);
    setIsPaused(false);
  };
  
  const endTimer = () => {
    setIsRunning(false);
    setIsPaused(false);
    setRemainingSeconds(0);
  };
  
  const pauseTimer = () => {
    setIsPaused(true);
  };
  
  const resumeTimer = () => {
    setIsPaused(false);
  };
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Calculate progress percentage for visual indicator
  const progressPercent = isRunning 
    ? ((selectedMinutes * 60 - remainingSeconds) / (selectedMinutes * 60)) * 100 
    : 0;

  return (
    <PracticeTimerContext.Provider value={{
      isRunning,
      isPaused,
      remainingSeconds,
      inputValue,
      selectedMinutes,
      isValidInput,
      showComplete,
      setInputValue,
      setShowComplete,
      startTimer,
      pauseTimer,
      resumeTimer,
      endTimer,
      formatTime,
      progressPercent,
    }}>
      {children}
    </PracticeTimerContext.Provider>
  );
}

export function usePracticeTimer() {
  const context = useContext(PracticeTimerContext);
  if (!context) {
    throw new Error('usePracticeTimer must be used within a PracticeTimerProvider');
  }
  return context;
}
