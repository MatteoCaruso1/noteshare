import { Music, Clock, Square, Pause } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useActiveSession } from '@/hooks/useSessions';
import { useAuth } from '@/hooks/useAuth';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { StreakIndicator } from '@/components/StreakIndicator';
import { usePremium } from '@/contexts/PremiumContext';

export function AppHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { isPremium, isLoading: isPremiumLoading } = usePremium();
  const { data: activeSession } = useActiveSession(profile?.id);
  const [elapsed, setElapsed] = useState('0:00');

  const isPaused = !!activeSession?.paused_at;

  useEffect(() => {
    if (!activeSession) {
      setElapsed('--:--');
      document.title = 'Noteshare | Practice Smarter';
      return;
    }

    const updateElapsed = () => {
      const start = new Date(activeSession.started_at).getTime();
      const now = Date.now();
      const pausedMs = activeSession.paused_duration_ms || 0;
      // If currently paused, add the current pause duration
      const currentPauseMs = activeSession.paused_at 
        ? now - new Date(activeSession.paused_at).getTime() 
        : 0;
      const activeDurationMs = now - start - pausedMs - currentPauseMs;
      const diff = Math.max(0, Math.floor(activeDurationMs / 1000));
      
      const hours = Math.floor(diff / 3600);
      const minutes = Math.floor((diff % 3600) / 60);
      const seconds = diff % 60;
      
      let timeStr: string;
      if (hours > 0) {
        timeStr = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      } else {
        timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      }
      
      setElapsed(timeStr);
      // Update browser tab with timer
      document.title = `${timeStr} | Noteshare`;
    };

    // Initialize immediately
    updateElapsed();
    // Update every second
    const interval = setInterval(updateElapsed, 1000);
    return () => {
      clearInterval(interval);
      document.title = 'Noteshare | Practice Smarter';
    };
  }, [activeSession]);
  
  // Check if on welcome/landing page - include "/" for non-logged-in users
  const isOnWelcomePage = location.pathname === '/welcome' || location.pathname === '/science-of-practice' || location.pathname === '/pricing' || (location.pathname === '/' && !user);
  
  // Don't show on auth page
  if (location.pathname === '/auth') {
    return null;
  }

  const handleEndSession = () => {
    if (!activeSession || !profile) return;

    // Navigate to home page and signal PracticeControls to open EndSessionDialog
    // Use setTimeout to ensure PracticeControls is mounted after navigation
    if (location.pathname === '/') {
      // Already on home page, just dispatch immediately
      window.dispatchEvent(new CustomEvent('open-end-session-dialog'));
    } else {
      navigate('/');
      // Wait for navigation + mount before dispatching
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('open-end-session-dialog'));
      }, 300);
    }
  };

  const isSessionActive = user && profile && activeSession;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-border">
      <div className={`flex h-12 items-center justify-between px-4 ${isOnWelcomePage ? 'w-full' : 'container'}`}>
        <div className="flex items-center gap-3">
          <Link to="/welcome" onClick={() => window.scrollTo(0, 0)} className="flex items-center gap-2 hover:underline decoration-foreground underline-offset-2">
            <Music className="h-5 w-5 text-primary" />
            <div className="flex flex-col">
              <div className="flex items-baseline gap-1">
                <span className="font-semibold leading-tight text-foreground">Noteshare</span>
                {!isPremiumLoading && isPremium && (
                  <span className="font-semibold leading-tight text-primary animate-fade-in-slow">
                    Pro
                  </span>
                )}
              </div>
              <span className="text-[9px] leading-tight text-foreground">
                Practice Smarter
              </span>
            </div>
          </Link>
          {isOnWelcomePage && (
            <nav className="flex items-center gap-1 ml-2 sm:ml-6">
              <Link
                to="/science-of-practice"
                className={`px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs rounded-md transition-colors hover:underline whitespace-nowrap ${
                  location.pathname === '/science-of-practice'
                    ? 'text-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <span className="sm:hidden">Practice</span>
                <span className="hidden sm:inline">Science of Effective Practice</span>
              </Link>
              <Link
                to="/pricing"
                className={`px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs rounded-md transition-colors hover:underline ${
                  location.pathname === '/pricing'
                    ? 'text-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Product Tiers
              </Link>
            </nav>
          )}
        </div>
        
        {/* Right side: CTA on welcome pages, Timer & Streak on app pages */}
        {isOnWelcomePage ? (
          <div className="hidden sm:flex items-center">
            <Button
              size="sm"
              className="bg-primary text-primary-foreground hover:bg-primary/90 text-[11px] px-3 py-1 h-8 font-medium"
              onClick={() => {
                window.scrollTo(0, 0);
                if (user) {
                  navigate('/');
                } else {
                  const from = location.pathname === '/pricing' ? 'pricing' 
                    : location.pathname === '/science-of-practice' ? 'science' 
                    : undefined;
                  navigate(from ? `/auth?from=${from}` : '/auth');
                }
              }}
            >
              Start practicing
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 transition-opacity duration-700 session-focus-exempt opacity-100">
            {user && (
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors ${
                      isSessionActive 
                        ? 'bg-primary/15 text-primary hover:bg-primary/25 cursor-pointer' 
                        : 'text-muted-foreground/40 cursor-default'
                    }`}
                    disabled={!isSessionActive}
                  >
                    <div className="relative">
                      <Clock className="h-4 w-4" />
                      {isSessionActive && (
                        <div className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ${isPaused ? 'bg-amber-500' : 'bg-green-500 recording-pulse'}`} />
                      )}
                    </div>
                    <span className={`text-xs font-mono ${isSessionActive && !isPaused ? 'timer-tick' : ''}`}>
                      {elapsed}
                    </span>
                    {isPaused && (
                      <Pause className="h-3 w-3 text-amber-500" />
                    )}
                  </button>
                </PopoverTrigger>
                {isSessionActive && (
                  <PopoverContent className="w-48 p-3" align="end">
                    <div className="space-y-3">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground mb-1">Session Active</p>
                        <p className="text-lg font-mono font-semibold text-primary">{elapsed}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-xs"
                          onClick={() => navigate('/')}
                        >
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="flex-1 text-xs gap-1"
                          onClick={handleEndSession}
                        >
                          <Square className="w-3 h-3" />
                          End
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                )}
              </Popover>
            )}
            {user && <StreakIndicator />}
          </div>
        )}
      </div>
    </header>
  );
}