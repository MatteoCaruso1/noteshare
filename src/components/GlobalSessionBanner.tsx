import { useActiveSession, useEndSession } from '@/hooks/useSessions';
import { useCreateNote } from '@/hooks/useNotes';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'react-router-dom';
import { Clock, Square } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

export function GlobalSessionBanner() {
  const { user, profile } = useAuth();
  const { data: activeSession } = useActiveSession();
  const endSession = useEndSession();
  const createNote = useCreateNote();
  const location = useLocation();
  const [elapsed, setElapsed] = useState('0:00');

  useEffect(() => {
    if (!activeSession) return;

    const updateElapsed = () => {
      const start = new Date(activeSession.started_at).getTime();
      const now = Date.now();
      const diff = Math.floor((now - start) / 1000);
      
      const hours = Math.floor(diff / 3600);
      const minutes = Math.floor((diff % 3600) / 60);
      const seconds = diff % 60;
      
      if (hours > 0) {
        setElapsed(`${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      } else {
        setElapsed(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      }
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [activeSession]);

  if (!user || !profile || !activeSession) return null;

  // Don't show on auth page
  if (location.pathname === '/auth') return null;

  const handleEndSession = async () => {
    await endSession.mutateAsync({ sessionId: activeSession.id });
    // Create an empty note for the session (same behavior as Practice page)
    // Stay on current page - don't navigate away
    createNote.mutate({
      authorId: profile.id,
      sessionId: activeSession.id,
      visibility: 'friends',
    });
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-primary/95 backdrop-blur-sm border-b border-primary-foreground/20">
      <div className="container max-w-2xl mx-auto px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-primary-foreground recording-pulse" />
            <span className="text-sm font-medium text-primary-foreground">Session Active</span>
            <span className="text-sm text-primary-foreground/80 flex items-center gap-1 font-mono">
              <Clock className="w-3 h-3" /> {elapsed}
            </span>
          </div>
          <Button
            size="sm"
            variant="secondary"
            className="h-7 text-xs gap-1"
            onClick={handleEndSession}
            disabled={endSession.isPending || createNote.isPending}
          >
            <Square className="w-3 h-3" />
            End
          </Button>
        </div>
      </div>
    </div>
  );
}
