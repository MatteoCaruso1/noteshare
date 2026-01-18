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
    return <div className="min-h-screen bg-background" />;
  }

  return <WelcomeHero />;
};

export default Welcome;
