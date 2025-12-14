import { Music } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useActiveSession } from '@/hooks/useSessions';
import { useAuth } from '@/hooks/useAuth';

export function AppHeader() {
  const location = useLocation();
  const { user } = useAuth();
  const { data: activeSession } = useActiveSession();
  
  // Don't show on auth page
  if (location.pathname === '/auth') {
    return null;
  }

  const hasActiveSession = user && activeSession;

  return (
    <header 
      className="sticky z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border"
      style={{ top: hasActiveSession ? '40px' : '0px' }}
    >
      <div className="container flex h-12 items-center px-4">
        <Link to="/" className="flex items-center gap-2">
          <Music className="h-5 w-5 text-primary" />
          <span className="font-semibold text-foreground">noteshare</span>
        </Link>
      </div>
    </header>
  );
}
