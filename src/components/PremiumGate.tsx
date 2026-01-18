import React, { ReactNode } from 'react';
import { Lock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePremium } from '@/contexts/PremiumContext';
import { cn } from '@/lib/utils';

interface PremiumGateProps {
  children: ReactNode;
  /** Feature name shown in the upgrade prompt */
  featureName: string;
  /** Whether to blur the content (true) or just show an overlay (false) */
  blur?: boolean;
  /** Custom class for the container */
  className?: string;
  /** Compact mode for inline elements */
  compact?: boolean;
  /** Whether to show the children at all when gated (false = completely hide) */
  showPreview?: boolean;
}

export function PremiumGate({ 
  children, 
  featureName, 
  blur = true,
  className,
  compact = false,
  showPreview = true
}: PremiumGateProps) {
  const { isPremium, isLoading, startCheckout } = usePremium();

  // Premium users see content normally
  if (isPremium) {
    return <>{children}</>;
  }

  // Still loading subscription status - show content without gate
  if (isLoading) {
    return <>{children}</>;
  }

  // Free user - gate the content
  if (!showPreview) {
    return (
      <GateOverlay 
        featureName={featureName} 
        compact={compact} 
        onUpgrade={startCheckout}
        standalone
      />
    );
  }

  return (
    <div className={cn("relative", className)}>
      {/* Blurred/dimmed content */}
      <div 
        className={cn(
          "pointer-events-none select-none",
          blur ? "blur-sm" : "opacity-40"
        )}
        aria-hidden="true"
      >
        {children}
      </div>
      
      {/* Overlay with upgrade prompt */}
      <GateOverlay 
        featureName={featureName} 
        compact={compact} 
        onUpgrade={startCheckout}
      />
    </div>
  );
}

interface GateOverlayProps {
  featureName: string;
  compact: boolean;
  onUpgrade: () => void;
  standalone?: boolean;
}

function GateOverlay({ featureName, compact, onUpgrade, standalone }: GateOverlayProps) {
  if (compact) {
    return (
      <div className={cn(
        "flex items-center gap-2 bg-muted/80 backdrop-blur-sm rounded-md px-3 py-2",
        !standalone && "absolute inset-0 justify-center"
      )}>
        <Lock className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Premium</span>
        <Button 
          size="sm" 
          variant="outline" 
          className="h-6 text-xs px-2"
          onClick={onUpgrade}
        >
          Upgrade
        </Button>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex flex-col items-center justify-center gap-3 p-6 text-center",
      !standalone && "absolute inset-0 bg-background/60 backdrop-blur-[2px] rounded-lg"
    )}>
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
        <Sparkles className="h-5 w-5 text-primary" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">
          {featureName}
        </p>
        <p className="text-xs text-muted-foreground">
          Upgrade to Premium to unlock this feature
        </p>
      </div>
      <Button 
        size="sm" 
        onClick={onUpgrade}
        variant="hero"
        className="gap-1.5"
      >
        <Sparkles className="h-3.5 w-3.5" />
        Upgrade to Premium
      </Button>
    </div>
  );
}

/** 
 * A simple badge/button to show premium-only status inline 
 */
export function PremiumBadge({ 
  featureName,
  className 
}: { 
  featureName: string;
  className?: string;
}) {
  const { isPremium, startCheckout } = usePremium();

  if (isPremium) return null;

  return (
    <Button
      variant="outline"
      size="sm"
      className={cn(
        "h-6 text-xs px-2 gap-1 text-muted-foreground hover:text-foreground",
        className
      )}
      onClick={startCheckout}
      title={`${featureName} is a Premium feature`}
    >
      <Lock className="h-3 w-3" />
      Premium
    </Button>
  );
}

/**
 * Hook to check if a feature is available
 */
export function useFeatureAccess() {
  const { isPremium, isLoading } = usePremium();
  
  return {
    isPremium,
    isLoading,
    canAccess: (feature: string) => isPremium,
  };
}
