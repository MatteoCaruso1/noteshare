import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Target, User, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUnreadNotificationCount } from '@/hooks/useNotifications';
import { clearScrollState } from '@/hooks/useScrollRestoration';
import { markScrollToTop } from '@/components/ScrollToTop';

interface BottomNavProps {
  overrideActiveRoute?: string;
}

// Map routes to their scroll restoration keys
const routeScrollKeys: Record<string, string> = {
  '/': 'index-timeline',
  '/friends': 'friends-feed',
  '/working-toward': 'working-toward-top',
  '/projects': 'projects-top',
  '/gigs': 'gigs-top',
  '/profile': 'profile-top',
};

export function BottomNav({ overrideActiveRoute }: BottomNavProps = {}) {
  const location = useLocation();
  const { data: unreadCount } = useUnreadNotificationCount();
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  // Detect keyboard open/close on mobile
  useEffect(() => {
    const handleResize = () => {
      // On mobile, when keyboard opens, the visual viewport height shrinks significantly
      if (window.visualViewport) {
        const viewportHeight = window.visualViewport.height;
        const windowHeight = window.innerHeight;
        // If viewport is significantly smaller than window, keyboard is likely open
        setIsKeyboardOpen(windowHeight - viewportHeight > 150);
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
      handleResize(); // Check initial state
    }

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
      }
    };
  }, []);

  const links = [
    { to: '/', icon: Home, label: 'Practice', mobileLabel: 'Practice' },
    { to: '/working-toward', icon: Target, label: 'Working Toward', mobileLabel: 'Working\nToward' },
    { to: '/friends', icon: Users, label: "Friends' Practice", mobileLabel: "Friends'\nPractice", showBadge: true },
    { to: '/profile', icon: User, label: 'Profile', mobileLabel: 'Profile' },
  ];

  // Check if we're on a user profile page (part of friends flow)
  const isUserProfilePage = location.pathname.startsWith('/user/') || location.pathname.startsWith('/profile/');
  
  // Check if we're on a note detail page (still part of My Notes flow)
  const isNoteDetailPage = location.pathname.startsWith('/notes/');
  
  // Determine current path - allow override for nested routes
  const currentPath = overrideActiveRoute || location.pathname;

  const handleNavClick = (to: string, e: React.PointerEvent) => {
    // If tapping the current tab, scroll to top
    if (to === location.pathname) {
      e.preventDefault();
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
      return;
    }

    // Clear scroll state for the destination so it starts at top
    const scrollKey = routeScrollKeys[to];
    if (scrollKey) {
      clearScrollState(scrollKey);
    }

    // Mark this navigation to scroll to top after route change
    // The ScrollToTop component will handle the actual scroll
    markScrollToTop(to);
  };

  // Hide bottom nav when keyboard is open on mobile
  if (isKeyboardOpen) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border pb-[env(safe-area-inset-bottom,0px)] md:pb-0 max-md:pb-[calc(env(safe-area-inset-bottom,0px)+12px)]">
      <div className="container max-w-2xl mx-auto px-2 sm:px-4">
        <div className="flex items-start justify-around py-1.5">
          {links.map(({ to, icon: Icon, label, mobileLabel, showBadge }) => {
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
                onPointerDown={(e) => handleNavClick(to, e)}
                className={cn(
                  'flex flex-col items-center gap-0.5 px-1.5 sm:px-2 py-1 sm:py-2 rounded-lg transition-colors min-w-0 flex-1 max-w-[72px] relative touch-manipulation',
                  isActive ? 'text-primary' : 'text-muted-foreground [@media(hover:hover)]:hover:text-foreground'
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
                <span className="text-[8px] sm:text-[10px] text-center whitespace-pre-line leading-[1.1] h-[18px] sm:h-auto sm:whitespace-nowrap flex items-start justify-center">
                  <span className="sm:hidden">{mobileLabel}</span>
                  <span className="hidden sm:inline">{label}</span>
                </span>
              </NavLink>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
