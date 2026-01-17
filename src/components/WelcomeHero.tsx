import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { LandingFeatures } from './LandingFeatures';
import { LandingTestimonial } from './LandingTestimonial';

export function WelcomeHero() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isExiting, setIsExiting] = useState(false);
  const [scrollOpacity, setScrollOpacity] = useState(1);

  // Hide scrollbars during exit animation to prevent grey lines
  useEffect(() => {
    if (isExiting) {
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    };
  }, [isExiting]);

  // Scroll-linked opacity for hero content
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const fadeStart = 0;
      const fadeEnd = 400;
      const opacity = Math.max(0, 1 - (scrollY - fadeStart) / (fadeEnd - fadeStart));
      setScrollOpacity(opacity);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavigate = (destination: 'auth' | 'app') => {
    setIsExiting(true);
    setTimeout(() => {
      navigate(destination === 'auth' ? '/auth' : '/');
    }, 400);
  };

  const handleStartPracticing = () => {
    // If user is already logged in, take them to the app
    // Otherwise, take them to auth
    handleNavigate(user ? 'app' : 'auth');
  };

  const handleAuthClick = () => {
    // If user is logged in, go to app; otherwise go to auth
    handleNavigate(user ? 'app' : 'auth');
  };

  return (
    <div 
      className={`bg-background flex flex-col -mt-16 transition-all duration-500 ease-out ${
        isExiting 
          ? 'opacity-0 blur-sm scale-[1.02] overflow-hidden' 
          : 'animate-hero-enter'
      }`}
    >
      {/* Hero Section */}
      <div className="min-h-[85dvh] flex flex-col overflow-hidden relative">
        {/* Header - stays visible */}
        <header className="w-full px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-semibold tracking-tight">noteshare</span>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <Button 
                variant="outline"
                className="border-border hover:bg-accent"
                onClick={() => handleNavigate('app')}
              >
                Go to app
              </Button>
            ) : (
              <>
                <Button 
                  variant="ghost" 
                  className="text-muted-foreground hover:text-foreground"
                  onClick={handleAuthClick}
                >
                  Log in
                </Button>
                <Button 
                  variant="outline"
                  className="border-border hover:bg-accent"
                  onClick={handleAuthClick}
                >
                  Sign up
                </Button>
              </>
            )}
          </div>
        </header>

        {/* Hero Content - fades on scroll */}
        <main 
          className="flex-1 flex flex-col justify-center px-6 md:px-12 lg:px-24 max-w-6xl transition-opacity duration-100 pt-8 md:pt-12"
          style={{ opacity: scrollOpacity }}
        >
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold tracking-tight leading-[1.1] text-foreground mb-6">
            Noteshare is a purpose-built tool to help musicians practice smarter
          </h1>
          <p className="text-lg md:text-xl text-gray-500 max-w-2xl mb-8 leading-relaxed">
            Organize, record, and share your practice. Manage your musical life, all in one place
          </p>
          <div className="flex items-center gap-4">
            <Button
              size="lg"
              className="relative overflow-hidden bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-8 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-200 hover:scale-[1.02] group"
              onClick={handleStartPracticing}
            >
              <span className="relative z-10">Start practicing</span>
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out animate-glint" />
            </Button>
          </div>
        </main>

        {/* Gradient accent line at top */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary via-accent to-primary opacity-60" />
      </div>

      {/* Features Section */}
      <LandingFeatures />

      {/* Testimonial Section */}
      <LandingTestimonial />
    </div>
  );
}
