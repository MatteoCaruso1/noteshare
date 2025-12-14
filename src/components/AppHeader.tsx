import { Music } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

export function AppHeader() {
  const location = useLocation();
  
  // Don't show on auth page
  if (location.pathname === '/auth') {
    return null;
  }

  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
      <div className="container flex h-12 items-center px-4">
        <Link to="/" className="flex items-center gap-2">
          <Music className="h-5 w-5 text-primary" />
          <span className="font-semibold text-foreground">noteshare</span>
        </Link>
      </div>
    </header>
  );
}
