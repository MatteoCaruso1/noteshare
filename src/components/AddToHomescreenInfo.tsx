import { Card } from '@/components/ui/card';
import { Smartphone, Share, Plus } from 'lucide-react';

export function AddToHomescreenInfo() {
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  // Check if already installed as PWA
  const isStandalone = typeof window !== 'undefined' && (
    window.matchMedia('(display-mode: standalone)').matches || 
    (window.navigator as any).standalone === true
  );

  // Don't show if already installed or not on mobile
  if (isStandalone || !isMobile) return null;

  return (
    <Card className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
          <Smartphone className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm mb-1">Add noteshare to your Home Screen</h3>
          <p className="text-xs text-muted-foreground mb-2">
            Access noteshare instantly, just like a real app!
          </p>
          {isIOS ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Share className="w-3.5 h-3.5" />
              <span>Tap Share</span>
              <span>→</span>
              <Plus className="w-3.5 h-3.5" />
              <span>Add to Home Screen</span>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Tap ⋮ menu → "Add to Home screen"
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
