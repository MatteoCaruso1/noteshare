import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { WelcomeHero } from '@/components/WelcomeHero';
import { useAuth } from '@/hooks/useAuth';
import { usePageMeta } from '@/hooks/usePageMeta';

const Welcome = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  usePageMeta({
    title: 'Noteshare — Music Practice Journal for Musicians',
    description: 'Capture practice ideas, track progress and share with trusted peers. The practice journal built for musicians. 10× easier than voice memos.',
    canonical: '/',
  });

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
