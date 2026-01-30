import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Music } from 'lucide-react';

interface WelcomeOnboardingModalProps {
  open: boolean;
  onGetStarted: () => void;
}

export function WelcomeOnboardingModal({ open, onGetStarted }: WelcomeOnboardingModalProps) {
  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="max-w-sm w-full bg-background border-none p-0 gap-0 flex flex-col items-center justify-center min-h-[70vh]"
        hideCloseButton
      >
        <div className="flex flex-col items-center justify-center px-8 py-12 text-center">
          {/* Logo */}
          <div className="w-32 h-32 rounded-full bg-muted/30 flex items-center justify-center mb-8">
            <div className="w-24 h-24 rounded-full bg-gradient-primary flex items-center justify-center">
              <Music className="w-12 h-12 text-primary-foreground" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-semibold text-foreground mb-2">
            Welcome to
          </h1>
          <h2 className="text-3xl font-semibold text-primary mb-6">
            Noteshare
          </h2>

          {/* Subtitle - from landing page */}
          <p className="text-muted-foreground text-base leading-relaxed mb-12">
            Helping musicians practice smarter. Organize, record, and share your practice, all in one place.
          </p>

          {/* Get Started Button */}
          <Button
            size="lg"
            className="w-full bg-gradient-primary text-primary-foreground font-semibold px-8 py-6 text-lg"
            onClick={onGetStarted}
          >
            Get Started
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
