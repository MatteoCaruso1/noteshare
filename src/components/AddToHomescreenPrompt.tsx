import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Share, Plus, Check } from 'lucide-react';

const HOMESCREEN_PROMPT_KEY = 'noteshare_homescreen_prompt_dismissed_v2';
const HOMESCREEN_PROMPT_TRIGGERED_KEY = 'noteshare_homescreen_prompt_triggered';

// Check if the app is installed as a PWA
const isAppInstalled = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches || 
         (window.navigator as any).standalone === true;
};

// Check if should show the prompt (mobile, not installed, not dismissed)
const shouldShowPrompt = () => {
  if (typeof window === 'undefined') return false;
  
  // Check if already dismissed
  const alreadyDismissed = localStorage.getItem(HOMESCREEN_PROMPT_KEY);
  if (alreadyDismissed === 'true') return false;
  
  // Detect mobile device
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  if (!isMobile) return false;
  
  // Check if already installed as PWA
  if (isAppInstalled()) return false;
  
  return true;
};

// Hook to trigger the homescreen prompt after first note
export function useHomescreenPromptTrigger() {
  const triggerPrompt = useCallback((totalNoteCount: number) => {
    // Trigger on second note (first is auto-created during FTUE)
    if (totalNoteCount !== 2) return;
    
    // Check if already triggered or dismissed
    if (localStorage.getItem(HOMESCREEN_PROMPT_TRIGGERED_KEY) === 'true') return;
    if (localStorage.getItem(HOMESCREEN_PROMPT_KEY) === 'true') return;
    
    // Mark as triggered
    localStorage.setItem(HOMESCREEN_PROMPT_TRIGGERED_KEY, 'true');
    
    // Dispatch custom event to trigger the prompt
    window.dispatchEvent(new CustomEvent('show-homescreen-prompt'));
  }, []);
  
  return { triggerPrompt };
}

export function AddToHomescreenPrompt() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleShowPrompt = () => {
      if (!shouldShowPrompt()) return;
      
      // Show after a short delay
      setTimeout(() => {
        setOpen(true);
      }, 1500);
    };
    
    window.addEventListener('show-homescreen-prompt', handleShowPrompt);
    return () => window.removeEventListener('show-homescreen-prompt', handleShowPrompt);
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
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center overflow-hidden">
              <img 
                src="/apple-touch-icon.png" 
                alt="Noteshare" 
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement?.classList.add('flex', 'items-center', 'justify-center');
                  const icon = document.createElement('div');
                  icon.innerHTML = '<svg class="w-8 h-8 text-primary-foreground" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>';
                  e.currentTarget.parentElement?.appendChild(icon);
                }}
              />
            </div>
          </div>
          <DialogTitle className="text-center text-xl">
            Install Noteshare
          </DialogTitle>
          <DialogDescription className="text-center">
            Add to your home screen for the full app experience—instant access, offline support, and no browser bars!
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {isIOS && (
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-primary">1</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Tap the Share button</p>
                  <p className="text-xs text-muted-foreground">At the bottom of Safari</p>
                </div>
                <Share className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              </div>
              
              <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-primary">2</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">"Add to Home Screen"</p>
                  <p className="text-xs text-muted-foreground">Scroll down in the share menu</p>
                </div>
                <Plus className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              </div>
              
              <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-primary">3</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Tap "Add"</p>
                  <p className="text-xs text-muted-foreground">Top right corner</p>
                </div>
                <Check className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              </div>
            </div>
          )}

          {isAndroid && (
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-primary">1</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Tap ⋮ menu</p>
                  <p className="text-xs text-muted-foreground">Top right of browser</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-primary">2</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">"Install app" or "Add to Home screen"</p>
                  <p className="text-xs text-muted-foreground">Look for the install option</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-primary">3</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Tap "Install"</p>
                  <p className="text-xs text-muted-foreground">Confirm to add the app</p>
                </div>
                <Check className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              </div>
            </div>
          )}

          {!isIOS && !isAndroid && (
            <p className="text-sm text-center text-muted-foreground">
              Look for "Add to Home Screen" or "Install" in your browser menu.
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
