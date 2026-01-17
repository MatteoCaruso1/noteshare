import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

export function WelcomeHero() {
  const navigate = useNavigate();
  const [isExiting, setIsExiting] = useState(false);

  const handleNavigateToAuth = () => {
    setIsExiting(true);
    setTimeout(() => {
      navigate('/auth');
    }, 400);
  };

  return (
    <div 
      className={`min-h-[100dvh] bg-background flex flex-col -mt-16 transition-all duration-500 ease-out ${
        isExiting 
          ? 'opacity-0 blur-sm scale-[1.02]' 
          : 'animate-hero-enter'
      }`}
    >
      {/* Header */}
      <header className="w-full px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl font-semibold tracking-tight">noteshare</span>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            className="text-muted-foreground hover:text-foreground"
            onClick={handleNavigateToAuth}
          >
            Log in
          </Button>
          <Button 
            variant="outline"
            className="border-border hover:bg-accent"
            onClick={handleNavigateToAuth}
          >
            Sign up
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col justify-center px-6 md:px-12 lg:px-24 max-w-6xl">
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold tracking-tight leading-[1.1] text-foreground mb-6">
          Noteshare is a purpose-built tool to help musicians practice smarter
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-8 leading-relaxed">
          Organize, record, and share your practice. Manage your musical life, all in one place.
        </p>
        <div className="flex items-center gap-4">
          <Button
            size="lg"
            className="bg-foreground text-background hover:bg-foreground/90 font-medium px-6"
            onClick={handleNavigateToAuth}
          >
            Start practicing
          </Button>
        </div>
      </main>

      {/* Gradient accent line at top */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary via-accent to-primary opacity-60" />
    </div>
  );
}
