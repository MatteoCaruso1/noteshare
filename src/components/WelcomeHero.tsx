import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Music, ArrowRight } from 'lucide-react';

export function WelcomeHero() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-primary mb-6">
        <Music className="w-10 h-10 text-primary-foreground" />
      </div>
      <h1 className="text-3xl font-semibold mb-2">Noteshare</h1>
      <p className="text-xl font-medium mb-8">Helping musicians practice smarter</p>
      <Button
        size="lg"
        className="bg-gradient-primary text-primary-foreground"
        onClick={() => navigate('/auth')}
      >
        Get Started <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  );
}
