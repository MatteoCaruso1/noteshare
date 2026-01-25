import React, { ReactNode } from 'react';
import { Lock, Sparkles, Target, TrendingUp, LucideIcon } from 'lucide-react';
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
  /** Custom icon to display */
  icon?: LucideIcon;
  /** Custom description text */
  description?: string;
}

export function PremiumGate({ 
  children, 
  featureName, 
  blur = true,
  className,
  compact = false,
  showPreview = true,
  icon,
  description
}: PremiumGateProps) {
  const { isPremium, isLoading, openPremiumDialog } = usePremium();

  // Premium users see content normally
  if (isPremium) {
    return <>{children}</>;
  }

  // Still loading subscription status - show gated view to prevent flickering
  // This ensures content stays protected during initial load and refreshes
  if (isLoading) {
    if (!showPreview) {
      // Show a loading skeleton for non-preview gates
      return (
        <div className={cn("flex flex-col items-center justify-center gap-2 py-4 px-6", className)}>
          <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
          <div className="w-32 h-4 bg-muted rounded animate-pulse" />
          <div className="w-24 h-8 bg-muted rounded animate-pulse" />
        </div>
      );
    }
    // For preview gates, show blurred content with a stable min-height to prevent jitter
    return (
      <div className={cn("relative min-h-[400px]", className)}>
        <div 
          className={cn(
            "pointer-events-none select-none",
            blur ? "blur-sm" : "opacity-40"
          )}
          aria-hidden="true"
        >
          {children}
        </div>
        {/* Centered loading indicator */}
        <div className="absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-[1px] rounded-lg">
          <div className="w-6 h-6 rounded-full border-2 border-muted border-t-foreground animate-spin" />
        </div>
      </div>
    );
  }

  // Free user - gate the content
  if (!showPreview) {
    return (
      <GateOverlay 
        featureName={featureName} 
        compact={compact} 
        onUpgrade={openPremiumDialog}
        standalone
        icon={icon}
        description={description}
      />
    );
  }

  return (
    <div className={cn("relative min-h-[400px]", className)}>
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
      
      {/* Overlay with upgrade prompt - uses sticky positioning for stable placement */}
      <GateOverlay 
        featureName={featureName} 
        compact={compact} 
        onUpgrade={openPremiumDialog}
        icon={icon}
        description={description}
      />
    </div>
  );
}

interface GateOverlayProps {
  featureName: string;
  compact: boolean;
  onUpgrade: () => void;
  standalone?: boolean;
  icon?: LucideIcon;
  description?: string;
}

function GateOverlay({ featureName, compact, onUpgrade, standalone, icon, description }: GateOverlayProps) {
  const Icon = icon || Target;
  const descriptionText = description || "Upgrade to Premium to organize\nnotes around goals, projects, and gigs";
  
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
      "flex flex-col items-center justify-center gap-2 py-4 px-6 text-center",
      !standalone && "absolute inset-x-0 top-[120px] bg-background/60 backdrop-blur-[2px] rounded-lg mx-auto w-fit"
    )}>
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-jazz-gold/10">
        <Icon className="h-5 w-5 text-jazz-gold" />
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
        {descriptionText}
      </p>
      <Button 
        size="sm" 
        onClick={onUpgrade}
        variant="hero"
        className="gap-1.5"
      >
        <Sparkles className="h-3.5 w-3.5" />
        Try Premium for Free
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
  const { isPremium, openPremiumDialog } = usePremium();

  if (isPremium) return null;

  return (
    <Button
      variant="outline"
      size="sm"
      className={cn(
        "h-6 text-xs px-2 gap-1 text-muted-foreground hover:text-foreground",
        className
      )}
      onClick={openPremiumDialog}
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
