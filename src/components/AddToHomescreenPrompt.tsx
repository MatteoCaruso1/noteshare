import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Smartphone, Share, Plus, X } from 'lucide-react';

const HOMESCREEN_PROMPT_KEY = 'noteshare_homescreen_prompt_shown';

export function AddToHomescreenPrompt() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Check if already shown
    const alreadyShown = localStorage.getItem(HOMESCREEN_PROMPT_KEY);
    if (alreadyShown) return;

    // Detect mobile device
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (!isMobile) return;

    // Check if already installed as PWA (standalone mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                         (window.navigator as any).standalone === true;
    if (isStandalone) return;

    // Show after a short delay
    const timer = setTimeout(() => {
      setOpen(true);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    localStorage.setItem(HOMESCREEN_PROMPT_KEY, 'true');
    setOpen(false);
  };

  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isAndroid = /Android/i.test(navigator.userAgent);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
              <Smartphone className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>
          <DialogTitle className="text-center text-xl">
            Add noteshare to your Home Screen
          </DialogTitle>
          <DialogDescription className="text-center">
            We don't have a mobile app yet, but you know what's almost as good? Adding noteshare to your home screen!
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {isIOS && (
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-primary">1</span>
                </div>
                <div>
                  <p className="text-sm font-medium">Tap the Share button</p>
                  <p className="text-xs text-muted-foreground">It's the square with an arrow at the bottom of Safari</p>
                </div>
                <Share className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              </div>
              
              <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-primary">2</span>
                </div>
                <div>
                  <p className="text-sm font-medium">Scroll and tap "Add to Home Screen"</p>
                  <p className="text-xs text-muted-foreground">You may need to scroll down to find it</p>
                </div>
                <Plus className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              </div>
              
              <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-primary">3</span>
                </div>
                <div>
                  <p className="text-sm font-medium">Tap "Add" in the top right</p>
                  <p className="text-xs text-muted-foreground">noteshare will appear on your home screen!</p>
                </div>
              </div>
            </div>
          )}

          {isAndroid && (
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-primary">1</span>
                </div>
                <div>
                  <p className="text-sm font-medium">Tap the menu (⋮) button</p>
                  <p className="text-xs text-muted-foreground">It's in the top-right corner of your browser</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-primary">2</span>
                </div>
                <div>
                  <p className="text-sm font-medium">Tap "Add to Home screen"</p>
                  <p className="text-xs text-muted-foreground">Or "Install app" depending on your browser</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-primary">3</span>
                </div>
                <div>
                  <p className="text-sm font-medium">Confirm by tapping "Add"</p>
                  <p className="text-xs text-muted-foreground">noteshare will appear on your home screen!</p>
                </div>
              </div>
            </div>
          )}

          {!isIOS && !isAndroid && (
            <p className="text-sm text-center text-muted-foreground">
              Look for "Add to Home Screen" in your browser's menu to install noteshare.
            </p>
          )}
        </div>

        <div className="flex justify-center">
          <Button onClick={handleClose} className="w-full">
            Got it!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
