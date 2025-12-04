import { Button } from '@/components/ui/button';
import { ArrowRight, Play } from 'lucide-react';

interface HeroSectionProps {
  onEnterFeed: () => void;
}

export function HeroSection({ onEnterFeed }: HeroSectionProps) {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-gradient-hero">
      {/* Noise overlay */}
      <div className="absolute inset-0 bg-noise opacity-[0.03] pointer-events-none" />
      
      {/* Gradient orbs */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-jazz-gold/10 rounded-full blur-[128px] animate-pulse" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-accent/10 rounded-full blur-[128px] animate-pulse" style={{ animationDelay: '1s' }} />
      
      {/* Floating musical notes decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <span className="absolute top-[15%] left-[10%] text-6xl opacity-10 float" style={{ animationDelay: '0s' }}>🎷</span>
        <span className="absolute top-[25%] right-[15%] text-5xl opacity-10 float" style={{ animationDelay: '0.5s' }}>🎺</span>
        <span className="absolute bottom-[30%] left-[20%] text-4xl opacity-10 float" style={{ animationDelay: '1s' }}>🎹</span>
        <span className="absolute bottom-[20%] right-[25%] text-5xl opacity-10 float" style={{ animationDelay: '1.5s' }}>🥁</span>
        <span className="absolute top-[40%] left-[5%] text-3xl opacity-10 float" style={{ animationDelay: '2s' }}>🎼</span>
      </div>

      <div className="container relative z-10 px-4 text-center">
        <div className="max-w-4xl mx-auto stagger-children">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 rounded-full bg-jazz-gold/10 border border-jazz-gold/20 backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-jazz-gold animate-pulse" />
            <span className="text-sm text-jazz-gold font-medium">The scene is live</span>
          </div>

          {/* Main heading */}
          <h1 className="font-display text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-bold mb-6 tracking-tight">
            <span className="text-foreground">Jazz is</span>
            <br />
            <span className="text-gradient-gold">Dead</span>
          </h1>

          {/* Tagline */}
          <p className="text-xl sm:text-2xl text-muted-foreground mb-4 font-display italic">
            "If jazz is dead, nobody told us."
          </p>
          <p className="text-lg text-muted-foreground/80 mb-10 max-w-2xl mx-auto">
            Share clips, discuss legends, post tutorials, and connect with the underground jazz community. 
            The music lives here.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              variant="hero"
              size="xl"
              onClick={onEnterFeed}
              className="group"
            >
              Dive into the Scene
              <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button
              variant="hero-outline"
              size="xl"
              className="group"
            >
              <Play className="h-5 w-5 mr-2" />
              Watch the Vibe
            </Button>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-center gap-8 sm:gap-12 mt-16 pt-8 border-t border-border/30">
            <div className="text-center">
              <p className="text-3xl sm:text-4xl font-display font-bold text-foreground">12K+</p>
              <p className="text-sm text-muted-foreground">Musicians</p>
            </div>
            <div className="text-center">
              <p className="text-3xl sm:text-4xl font-display font-bold text-jazz-gold">50K+</p>
              <p className="text-sm text-muted-foreground">Posts</p>
            </div>
            <div className="text-center">
              <p className="text-3xl sm:text-4xl font-display font-bold text-foreground">1M+</p>
              <p className="text-sm text-muted-foreground">Reactions</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
}
