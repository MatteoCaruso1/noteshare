import { useState, useEffect, useRef, useCallback } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Music, ClipboardList, User, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUnreadNotificationCount } from '@/hooks/useNotifications';
import { clearScrollState } from '@/hooks/useScrollRestoration';
import { useAuth } from '@/hooks/useAuth';
import { markScrollToTop } from '@/components/ScrollToTop';
import { useBottomNavOverride } from '@/contexts/BottomNavContext';

// Updates CSS variable with the actual measured height of the BottomNav
function useBottomNavHeightVariable(navRef: React.RefObject<HTMLElement | null>, shouldHide: boolean) {
  const updateHeight = useCallback(() => {
    if (shouldHide) {
      document.documentElement.style.setProperty('--bottom-nav-height', '0px');
      return;
    }
    if (navRef.current) {
      const height = navRef.current.getBoundingClientRect().height;
      document.documentElement.style.setProperty('--bottom-nav-height', `${height}px`);
    }
  }, [navRef, shouldHide]);

  useEffect(() => {
    updateHeight();

    // ResizeObserver to track nav height changes
    const nav = navRef.current;
    if (!nav) return;

    const resizeObserver = new ResizeObserver(() => {
      updateHeight();
    });
    resizeObserver.observe(nav);

    // Also listen for visualViewport changes (safe-area, keyboard)
    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener('resize', updateHeight);
    }

    return () => {
      resizeObserver.disconnect();
      if (vv) {
        vv.removeEventListener('resize', updateHeight);
      }
    };
  }, [navRef, updateHeight]);
}

// Map routes to their scroll restoration keys
const routeScrollKeys: Record<string, string> = {
  '/': 'index-timeline',
  '/friends': 'friends-feed',
  '/pursuits': 'pursuits-top',
  '/projects': 'projects-top',
  '/gigs': 'gigs-top',
  '/profile': 'profile-top',
};

// Routes where BottomNav should be hidden
const hiddenRoutes = ['/welcome', '/auth'];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: unreadCount } = useUnreadNotificationCount();
  const { overrideActiveRoute } = useBottomNavOverride();
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  // Detect PWA standalone mode vs browser
  useEffect(() => {
    const checkStandalone = () => {
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;
      setIsStandalone(standalone);
    };
    checkStandalone();
    const mql = window.matchMedia('(display-mode: standalone)');
    mql.addEventListener('change', checkStandalone);
    return () => mql.removeEventListener('change', checkStandalone);
  }, []);
  
  // Optimistic active route - updates immediately on click before navigation completes
  const [optimisticRoute, setOptimisticRoute] = useState<string | null>(null);
  const optimisticTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Hide on auth/welcome routes, or on root when not authenticated (landing page)
  const shouldHide = hiddenRoutes.includes(location.pathname) || 
    (location.pathname === '/' && !user) ||
    (location.pathname.startsWith('/profile/') && !user);

  // Measure and expose BottomNav height as a CSS variable for toasts/overlays
  useBottomNavHeightVariable(navRef, shouldHide);
  
  // Clear optimistic state whenever location changes (including on app resume from background)
  // This ensures we always sync with the actual route, not stale optimistic state
  useEffect(() => {
    setOptimisticRoute(null);
    if (optimisticTimeoutRef.current) {
      clearTimeout(optimisticTimeoutRef.current);
    }
  }, [location.pathname]);
  
  // Simple visibility - always visible, no complex fade-in logic that could cause issues
  const [isVisible, setIsVisible] = useState(true);

  // Detect keyboard open/close on mobile - only hide for large keyboards (not search bars)
  useEffect(() => {
    const handleResize = () => {
      // On mobile, when keyboard opens, the visual viewport height shrinks significantly
      // Use a higher threshold (250px) to avoid hiding for minor viewport changes
      // and only on actual mobile touch devices
      if (window.visualViewport) {
        const viewportHeight = window.visualViewport.height;
        const windowHeight = window.innerHeight;
        const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        // Only consider keyboard open if viewport shrinks by more than 250px AND on touch device
        const isKeyboard = isTouchDevice && (windowHeight - viewportHeight > 250);
        setIsKeyboardOpen(isKeyboard);
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
    { to: '/', icon: Music, label: 'Practice', mobileLabel: 'Practice' },
    { to: '/pursuits', icon: ClipboardList, label: 'Organize', mobileLabel: 'Organize' },
    { to: '/friends', icon: Users, label: 'Friends', mobileLabel: 'Friends', showBadge: true },
    { to: '/profile', icon: User, label: 'Profile', mobileLabel: 'Profile' },
  ];

  // Check if we're on a user profile page (part of friends flow)
  const isUserProfilePage = location.pathname.startsWith('/user/') || location.pathname.startsWith('/profile/');
  
  // Check if we're on a note detail page (still part of My Practice flow)
  const isNoteDetailPage = location.pathname.startsWith('/notes/');
  
  // Check if we're on a gig or project detail page (still part of My Practice flow)
  const isGigDetailPage = location.pathname.startsWith('/gigs/');
  const isProjectDetailPage = location.pathname.startsWith('/projects/');
  
  // Determine current path - allow override for nested routes
  const currentPath = overrideActiveRoute || location.pathname;

  const handleNavClick = (to: string, e: React.MouseEvent) => {
    e.preventDefault();

    // If tapping the current tab, scroll to top
    if (to === location.pathname) {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
      return;
    }

    // Set optimistic active state immediately for instant visual feedback
    setOptimisticRoute(to);
    
    // Clear optimistic state after 3 seconds as fallback (in case navigation fails)
    if (optimisticTimeoutRef.current) {
      clearTimeout(optimisticTimeoutRef.current);
    }
    optimisticTimeoutRef.current = setTimeout(() => {
      setOptimisticRoute(null);
    }, 3000);

    // Clear scroll state for the destination so it starts at top
    const scrollKey = routeScrollKeys[to];
    if (scrollKey) {
      clearScrollState(scrollKey);
    }

    // Mark this navigation to scroll to top after route change
    markScrollToTop(to);

    // Programmatic navigation guarantees route change in the same event as state update
    navigate(to);
  };

  // Don't render on hidden routes
  if (shouldHide) return null;

  return (
    <nav 
      ref={navRef}
      data-bottom-nav="true"
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border pb-[env(safe-area-inset-bottom,0px)] md:pb-0",
        // In browser mode on mobile, add extra bottom padding to account for Safari chrome
        !isStandalone && "max-md:pb-[calc(env(safe-area-inset-bottom,0px)+12px)]",
        // Hide via transform when keyboard is open (instead of returning null)
        isKeyboardOpen && "translate-y-full pointer-events-none"
      )}
      style={{
        // Force GPU layer and prevent iOS Safari fixed positioning issues
        WebkitTransform: isKeyboardOpen ? 'translateY(100%)' : 'translate3d(0,0,0)',
        transform: isKeyboardOpen ? 'translateY(100%)' : 'translate3d(0,0,0)',
        willChange: 'transform',
      }}
    >
      <div className="container max-w-2xl mx-auto px-2 sm:px-4">
        <div className="flex items-start justify-around py-1.5">
          {links.map(({ to, icon: Icon, label, mobileLabel, showBadge }) => {
            // Use optimistic route for instant feedback, then override, then standard logic
            let isActive: boolean;
            if (optimisticRoute) {
              // Optimistic: immediately show the clicked tab as active
              isActive = to === optimisticRoute;
            } else if (overrideActiveRoute) {
              isActive = to === overrideActiveRoute;
            } else {
              // Friends tab stays active when viewing user profiles
              // Practice tab stays active when viewing note details
              // Organize tab stays active when viewing folder/gig details
              isActive = currentPath === to || 
                (to === '/friends' && isUserProfilePage) ||
                (to === '/' && isNoteDetailPage) ||
                (to === '/pursuits' && (isProjectDetailPage || isGigDetailPage));
            }
            return (
              <NavLink
                key={to}
                to={to}
                onClick={(e) => handleNavClick(to, e)}
                data-tour={to === '/friends' ? 'friends-nav' : undefined}
                className={cn(
                  'flex flex-col items-center gap-0.5 px-1.5 sm:px-2 py-1 sm:py-2 rounded-lg transition-colors min-w-0 flex-1 max-w-[72px] relative touch-manipulation',
                  isActive ? 'text-primary' : 'text-muted-foreground [@media(hover:hover)]:hover:text-foreground'
                )}
              >
                <div className="relative">
                  <Icon className="w-5 h-5" />
                  {showBadge && typeof unreadCount === 'number' && unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-primary text-primary-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </div>
                <span className="text-[8px] sm:text-[10px] font-semibold text-center whitespace-pre-line leading-[1.1] h-[18px] sm:h-auto sm:whitespace-nowrap flex items-start justify-center">
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
