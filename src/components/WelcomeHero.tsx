import { useState, useEffect } from 'react';
import { LandingFeatures } from './LandingFeatures';
import { LandingTestimonial } from './LandingTestimonial';
import { MarketingCTA } from './MarketingCTA';

export function WelcomeHero() {
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

        {/* Floating musical decorative elements - left side */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Left cluster - staggered musical notes/symbols */}
          <div className="absolute top-[18%] -left-4 md:left-4 opacity-[0.07] text-primary text-5xl md:text-6xl rotate-[-15deg] select-none" aria-hidden="true">♪</div>
          <div className="absolute top-[35%] -left-2 md:left-8 opacity-[0.05] text-primary text-3xl md:text-4xl rotate-[10deg] select-none" aria-hidden="true">♫</div>
          <div className="absolute top-[55%] left-0 md:left-12 opacity-[0.06] text-primary text-4xl md:text-5xl rotate-[-8deg] select-none" aria-hidden="true">𝄞</div>
          <div className="absolute top-[72%] -left-1 md:left-6 opacity-[0.04] text-primary text-3xl rotate-[20deg] select-none" aria-hidden="true">♩</div>

          {/* Right cluster */}
          <div className="absolute top-[15%] -right-2 md:right-6 opacity-[0.06] text-primary text-4xl md:text-5xl rotate-[12deg] select-none" aria-hidden="true">𝄢</div>
          <div className="absolute top-[38%] -right-1 md:right-10 opacity-[0.05] text-primary text-5xl md:text-6xl rotate-[-18deg] select-none" aria-hidden="true">♬</div>
          <div className="absolute top-[58%] right-0 md:right-4 opacity-[0.07] text-primary text-3xl md:text-4xl rotate-[6deg] select-none" aria-hidden="true">♭</div>
          <div className="absolute top-[75%] right-2 md:right-14 opacity-[0.04] text-primary text-4xl rotate-[-10deg] select-none" aria-hidden="true">♯</div>

          {/* Decorative curved line - left */}
          <svg className="absolute top-[20%] -left-8 md:left-0 w-24 md:w-32 h-64 opacity-[0.06]" viewBox="0 0 100 200" fill="none" aria-hidden="true">
            <path d="M80 0 C60 40, 20 60, 40 100 C60 140, 20 160, 30 200" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeLinecap="round" />
          </svg>

          {/* Decorative curved line - right */}
          <svg className="absolute top-[25%] -right-8 md:right-0 w-24 md:w-32 h-64 opacity-[0.06]" viewBox="0 0 100 200" fill="none" aria-hidden="true">
            <path d="M20 0 C40 40, 80 60, 60 100 C40 140, 80 160, 70 200" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>

        {/* Hero Content - fades on scroll */}
        <main 
          className="flex-1 flex flex-col justify-center px-6 md:px-12 lg:px-24 w-full transition-opacity duration-100 pt-12 md:pt-16 relative z-10"
          style={{ opacity: scrollOpacity }}
        >
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold tracking-tight leading-[1.1] text-foreground mb-6 max-w-4xl lg:max-w-6xl">
            The Ultimate Practice Tracking Tool for Musicians
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl lg:max-w-none mb-8 leading-relaxed">
            Organize, record, and share your practice. Double your practice quality and become a better player
          </p>
          <MarketingCTA variant="hero" />
        </main>

      </div>

      {/* Features Section */}
      <LandingFeatures />

      {/* Testimonial Section */}
      <LandingTestimonial />
    </div>
  );
}
