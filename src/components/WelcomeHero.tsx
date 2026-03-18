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
        {/* Ambient glow effects */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Large primary glow - upper left */}
          <div className="absolute top-[10%] -left-20 w-[500px] h-[500px] md:w-[700px] md:h-[700px] bg-primary/10 rounded-full blur-[140px]" />
          {/* Accent orb - right side */}
          <div className="absolute top-[30%] right-[-10%] w-[350px] h-[350px] md:w-[500px] md:h-[500px] bg-primary/6 rounded-full blur-[120px]" />
          {/* Warm bottom glow */}
          <div className="absolute bottom-[5%] left-[20%] w-[600px] h-[300px] bg-primary/4 rounded-full blur-[100px]" />
          {/* Subtle grid overlay for depth */}
          <div 
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--primary)) 1px, transparent 0)`,
              backgroundSize: '48px 48px',
            }}
          />
          {/* Radial vignette to draw focus to center-left */}
          <div 
            className="absolute inset-0"
            style={{
              background: 'radial-gradient(ellipse 80% 70% at 30% 50%, transparent 0%, hsl(var(--background) / 0.4) 100%)',
            }}
          />
        </div>

        {/* Hero Content - fades on scroll */}
        <main 
          className="flex-1 flex flex-col justify-center px-6 md:px-12 lg:px-24 w-full transition-opacity duration-100 pt-12 md:pt-16 relative z-10"
          style={{ opacity: scrollOpacity }}
        >
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold tracking-tight leading-[1.1] text-foreground mb-6 max-w-4xl lg:max-w-6xl">
            The Ultimate Practice Tracking Tool for Musicians
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl lg:max-w-4xl mb-8 leading-relaxed">
            Organize, record, and share your practice. Double your practice quality and become a better player
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
