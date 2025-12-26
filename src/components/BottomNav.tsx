import { useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Disc3, Calendar, User, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUnreadNotificationCount } from '@/hooks/useNotifications';

interface BottomNavProps {
  overrideActiveRoute?: string;
}

export function BottomNav({ overrideActiveRoute }: BottomNavProps = {}) {
  const location = useLocation();
  const { data: unreadCount } = useUnreadNotificationCount();

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const links = [
    { to: '/', icon: Home, label: 'My Practice' },
    { to: '/projects', icon: Disc3, label: 'Projects' },
    { to: '/gigs', icon: Calendar, label: 'Gigs' },
    { to: '/friends', icon: Users, label: 'Friends', showBadge: true },
    { to: '/profile', icon: User, label: 'Profile' },
  ];

  // Check if we're on a user profile page (part of friends flow)
  const isUserProfilePage = location.pathname.startsWith('/user/') || location.pathname.startsWith('/profile/');
  
  // Check if we're on a note detail page (still part of My Notes flow)
  const isNoteDetailPage = location.pathname.startsWith('/notes/');
  
  // Determine current path - allow override for nested routes
  const currentPath = overrideActiveRoute || location.pathname;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border">
      <div className="container max-w-2xl mx-auto px-2 sm:px-4 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around py-2">
          {links.map(({ to, icon: Icon, label, showBadge }) => {
            // Use override if provided, otherwise fall back to standard logic
            let isActive: boolean;
            if (overrideActiveRoute) {
              isActive = to === overrideActiveRoute;
            } else {
              // Friends tab stays active when viewing user profiles
              // My Notes tab stays active when viewing note details
              isActive = currentPath === to || 
                (to === '/friends' && isUserProfilePage) ||
                (to === '/' && isNoteDetailPage);
            }
            return (
              <NavLink
                key={to}
                to={to}
                className={cn(
                  'flex flex-col items-center gap-0.5 px-1.5 sm:px-2 py-2 rounded-lg transition-colors min-w-0 flex-1 max-w-[72px] relative',
                  isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <div className="relative">
                  <Icon className="w-5 h-5" />
                  {showBadge && typeof unreadCount === 'number' && unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </div>
                <span className="text-[9px] sm:text-[10px] truncate">{label}</span>
              </NavLink>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
