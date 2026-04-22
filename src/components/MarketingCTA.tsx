import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface MarketingCTAProps {
  /** Visual variant for different contexts */
  variant?: 'hero' | 'inline' | 'compact';
  className?: string;
}

export function MarketingCTA({ variant = 'inline', className = '' }: MarketingCTAProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleGetStarted = () => {
    window.scrollTo(0, 0);
    if (user) {
      navigate('/');
    } else {
      navigate('/ftue');
    }
  };

  const handleExistingAccount = () => {
    window.scrollTo(0, 0);
    navigate('/auth?mode=login');
  };

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Button
          size="sm"
          className="bg-primary text-primary-foreground hover:bg-primary/80 hover:brightness-110 text-[11px] px-3 py-1 h-8 font-medium transition-all"
          onClick={handleGetStarted}
        >
          Get Started
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="bg-background text-foreground border-border hover:bg-accent text-[11px] px-3 py-1 h-8 font-medium transition-all"
          onClick={handleExistingAccount}
        >
          I Already Have an Account
        </Button>
      </div>
    );
  }

  if (variant === 'hero') {
    return (
      <div className={`flex flex-col sm:flex-row items-start sm:items-center gap-3 ${className}`}>
        <div className="relative group">
          {/* Slow, soft glow halo */}
          <div className="absolute -inset-1 bg-gradient-to-r from-primary via-primary/80 to-primary rounded-lg blur-lg opacity-50 group-hover:opacity-80 transition-opacity duration-500 animate-[pulse_5s_ease-in-out_infinite]" />
          <Button
            size="lg"
            className="relative overflow-hidden bg-primary hover:bg-primary text-primary-foreground font-bold px-10 h-12 text-base shadow-2xl shadow-primary/40 hover:shadow-primary/60 transition-all duration-300 hover:scale-[1.04] group/btn ring-1 ring-primary-foreground/10"
            onClick={handleGetStarted}
          >
            <span className="relative z-10 flex items-center gap-2">
              Get Started
              <svg className="w-4 h-4 transition-transform duration-300 group-hover/btn:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </span>
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700 ease-out animate-glint" />
          </Button>
        </div>
        <Button
          size="lg"
          variant="outline"
          className="bg-background/80 backdrop-blur-sm text-foreground border-border hover:bg-accent hover:border-primary/30 font-semibold px-8 h-12 transition-all duration-200"
          onClick={handleExistingAccount}
        >
          I Already Have an Account
        </Button>
      </div>
    );
  }

  // Default inline variant
  return (
    <div className={`flex flex-col sm:flex-row justify-center items-center gap-3 ${className}`}>
      <Button
        size="lg"
        className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold px-8 shadow-lg shadow-primary/25 transition-all duration-200 hover:scale-[1.02]"
        onClick={handleGetStarted}
      >
        Get Started
      </Button>
      <Button
        size="lg"
        variant="outline"
        className="bg-background text-foreground border-border hover:bg-accent font-bold px-8 transition-all duration-200"
        onClick={handleExistingAccount}
      >
        I Already Have an Account
      </Button>
    </div>
  );
}
