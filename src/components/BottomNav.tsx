import { NavLink, useLocation } from 'react-router-dom';
import { Home, Music, Disc3, Calendar, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export function BottomNav() {
  const location = useLocation();

  const links = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/practice', icon: Music, label: 'Practice' },
    { to: '/projects', icon: Disc3, label: 'Projects' },
    { to: '/gigs', icon: Calendar, label: 'Gigs' },
    { to: '/profile', icon: User, label: 'Profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border safe-area-pb">
      <div className="container max-w-2xl mx-auto px-4">
        <div className="flex items-center justify-around py-2">
          {links.map(({ to, icon: Icon, label }) => {
            const isActive = location.pathname === to;
            return (
              <NavLink
                key={to}
                to={to}
                className={cn(
                  'flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors min-w-[60px]',
                  isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-xs">{label}</span>
              </NavLink>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
