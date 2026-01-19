import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Sparkles, PartyPopper } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { usePremium } from '@/contexts/PremiumContext';

// Simple confetti burst effect
function ConfettiBurst() {
  const [particles, setParticles] = useState<Array<{
    id: number;
    x: number;
    y: number;
    color: string;
    rotation: number;
    scale: number;
  }>>([]);

  useEffect(() => {
    const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96E6A1', '#DDA0DD'];
    const newParticles = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      scale: 0.5 + Math.random() * 0.5,
    }));
    setParticles(newParticles);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute animate-[confetti_2s_ease-out_forwards]"
          style={{
            left: `${p.x}%`,
            top: '-10%',
            backgroundColor: p.color,
            width: `${8 * p.scale}px`,
            height: `${12 * p.scale}px`,
            borderRadius: '2px',
            transform: `rotate(${p.rotation}deg)`,
            animationDelay: `${Math.random() * 0.5}s`,
          }}
        />
      ))}
    </div>
  );
}

export function SubscriptionSuccessCelebration() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showCelebration, setShowCelebration] = useState(false);
  const { checkSubscription } = usePremium();

  useEffect(() => {
    if (searchParams.get('subscription') === 'success') {
      setShowCelebration(true);
      // Clean up URL after showing
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('subscription');
      newParams.delete('session_id');
      setSearchParams(newParams, { replace: true });
      
      // CRITICAL: Refresh subscription status after successful checkout
      checkSubscription();
    }
  }, [searchParams, setSearchParams, checkSubscription]);

  if (!showCelebration) return null;

  return (
    <>
      <ConfettiBurst />
      <Dialog open={showCelebration} onOpenChange={setShowCelebration}>
        <DialogContent className="sm:max-w-md text-center">
          <DialogHeader className="items-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-2 mx-auto">
              <PartyPopper className="w-8 h-8 text-primary" />
            </div>
            <DialogTitle className="text-xl">Welcome to Premium!</DialogTitle>
            <DialogDescription className="text-base">
              Your 30-day free trial has started. Enjoy unlimited notes, practice stats, and all premium features!
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mt-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span>You're all set to level up your practice</span>
          </div>
          <Button onClick={() => setShowCelebration(false)} className="mt-4">
            Let's Go!
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
