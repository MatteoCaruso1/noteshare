import { lazy, Suspense } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { WelcomeHero } from '@/components/WelcomeHero';

// Lazy-load the authenticated dashboard so logged-out landing visitors
// don't pay the cost of parsing/compiling all dashboard code (Timeline,
// hooks, dialogs, etc.) on initial load. This dramatically reduces
// main-thread blocking time and Max Potential FID for the landing page.
const Index = lazy(() => import('./Index'));

const LandingGate = () => {
  const { user, loading: authLoading } = useAuth();

  if (authLoading) {
    return <div className="min-h-screen bg-background" />;
  }

  if (!user) {
    return <WelcomeHero />;
  }

  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <Index />
    </Suspense>
  );
};

export default LandingGate;
