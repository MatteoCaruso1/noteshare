import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { LandingFeatures } from './LandingFeatures';
import { LandingTestimonial } from './LandingTestimonial';
import { useAuth } from '@/hooks/useAuth';

export function WelcomeHero() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isExiting, setIsExiting] = useState(false);
  const [scrollOpacity, setScrollOpacity] = useState(1);

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

  const handleStartPracticing = () => {
    setIsExiting(true);
    setTimeout(() => {
      // If already signed in, go to main app; otherwise go to auth
      navigate(user ? '/' : '/auth');
    }, 400);
  };

  return (
    <div 
      className={`bg-transparent flex flex-col transition-all duration-500 ease-out relative z-10 pt-12 ${
        isExiting 
          ? 'opacity-0 blur-sm scale-[1.02] overflow-hidden' 
          : 'animate-hero-enter'
      }`}
    >
      {/* Hero Section */}
      <div className="min-h-[85dvh] flex flex-col overflow-hidden relative w-full">
        {/* Subtle gradient background effects - desktop only */}
        <div className="absolute inset-0 pointer-events-none hidden md:block">
          {/* Primary glow - top left */}
          <div className="absolute top-1/4 -left-32 w-[600px] h-[600px] bg-primary/8 rounded-full blur-[120px]" />
          {/* Secondary glow - bottom right */}
          <div className="absolute bottom-1/4 right-0 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px]" />
          {/* Subtle accent - center */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] bg-gradient-to-br from-primary/3 via-transparent to-transparent rounded-full blur-[80px]" />
        </div>

        {/* Hero Content - fades on scroll */}
        <main 
          className="flex-1 flex flex-col justify-center px-6 md:px-12 lg:px-24 w-full transition-opacity duration-100 pt-12 md:pt-16 relative z-10"
          style={{ opacity: scrollOpacity }}
        >
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold tracking-tight leading-[1.1] text-foreground mb-6 max-w-4xl lg:max-w-6xl">
            Noteshare is a purpose-built tool to help musicians practice smarter
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl lg:max-w-4xl mb-8 leading-relaxed">
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

      </div>

      {/* Features Section */}
      <LandingFeatures />

      {/* Testimonial Section */}
      <LandingTestimonial />
    </div>
  );
}
