import { NavLink, useLocation } from 'react-router-dom';
import { Home, Music, Disc3, Calendar, User, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

export function BottomNav() {
  const location = useLocation();

  const links = [
    { to: '/', icon: Home, label: 'My Journal' },
    { to: '/practice', icon: Music, label: 'Practice' },
    { to: '/projects', icon: Disc3, label: 'Projects' },
    { to: '/gigs', icon: Calendar, label: 'Gigs' },
    { to: '/friends', icon: Users, label: 'Friends' },
    { to: '/profile', icon: User, label: 'Profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border">
      <div className="container max-w-2xl mx-auto px-2 sm:px-4 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around py-2">
          {links.map(({ to, icon: Icon, label }) => {
            const isActive = location.pathname === to;
            return (
              <NavLink
                key={to}
                to={to}
                className={cn(
                  'flex flex-col items-center gap-0.5 px-1.5 sm:px-2 py-2 rounded-lg transition-colors min-w-0 flex-1 max-w-[64px]',
                  isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[9px] sm:text-[10px] truncate">{label}</span>
              </NavLink>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
