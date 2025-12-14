import { Music, Clock, Square } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useActiveSession, useEndSession } from '@/hooks/useSessions';
import { useCreateNote } from '@/hooks/useNotes';
import { useAuth } from '@/hooks/useAuth';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export function AppHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { data: activeSession } = useActiveSession();
  const endSession = useEndSession();
  const createNote = useCreateNote();
  const [elapsed, setElapsed] = useState('0:00');

  useEffect(() => {
    if (!activeSession) {
      setElapsed('0:00');
      return;
    }

    const updateElapsed = () => {
      const start = new Date(activeSession.started_at).getTime();
      const now = Date.now();
      const diff = Math.max(0, Math.floor((now - start) / 1000));
      
      const hours = Math.floor(diff / 3600);
      const minutes = Math.floor((diff % 3600) / 60);
      const seconds = diff % 60;
      
      if (hours > 0) {
        setElapsed(`${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      } else {
        setElapsed(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      }
    };

    // Initialize immediately
    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [activeSession]);
  
  // Don't show on auth page
  if (location.pathname === '/auth') {
    return null;
  }

  const handleEndSession = async () => {
    if (!activeSession || !profile) return;
    
    await endSession.mutateAsync({ sessionId: activeSession.id });
    createNote.mutate({
      authorId: profile.id,
      sessionId: activeSession.id,
      visibility: 'friends',
    });
  };

  const isSessionActive = user && profile && activeSession;

  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
      <div className="container flex h-12 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2">
            <Music className="h-5 w-5 text-primary" />
            <span className="font-semibold text-foreground">noteshare</span>
          </Link>
          
          {/* Session Timer Indicator */}
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
                  <div className={`relative ${isSessionActive ? '' : ''}`}>
                    <Clock className="h-4 w-4" />
                    {isSessionActive && (
                      <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-500 recording-pulse" />
                    )}
                  </div>
                  <span className={`text-xs font-mono ${isSessionActive ? 'timer-tick' : ''}`}>
                    {isSessionActive ? elapsed : '--:--'}
                  </span>
                </button>
              </PopoverTrigger>
              {isSessionActive && (
                <PopoverContent className="w-48 p-3" align="start">
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
                        onClick={() => navigate('/practice')}
                      >
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="flex-1 text-xs gap-1"
                        onClick={handleEndSession}
                        disabled={endSession.isPending || createNote.isPending}
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
        </div>
        
        {/* Slogan */}
        <div className="text-right hidden sm:block">
          <p className="text-xs font-medium text-foreground">Shape your practice. Grow together.</p>
          <p className="text-[10px] text-muted-foreground">built by musicians, for musicians</p>
        </div>
      </div>
    </header>
  );
}