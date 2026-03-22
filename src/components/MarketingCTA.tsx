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
      navigate('/auth');
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
        <Button
          size="lg"
          className="relative overflow-hidden bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-8 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-200 hover:scale-[1.02] group"
          onClick={handleGetStarted}
        >
          <span className="relative z-10">Get Started</span>
          <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out animate-glint" />
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

  // Default inline variant
  return (
    <div className={`flex flex-col sm:flex-row items-start sm:items-center gap-3 ${className}`}>
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
