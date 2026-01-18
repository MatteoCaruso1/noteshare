import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { WelcomeHero } from '@/components/WelcomeHero';
import { useAuth } from '@/hooks/useAuth';

const Welcome = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/', { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <div className="text-2xl font-semibold text-foreground mb-2">noteshare</div>
        <div className="animate-pulse text-muted-foreground text-sm">Loading...</div>
      </div>
    );
  }

  return <WelcomeHero />;
};

export default Welcome;
