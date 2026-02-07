import * as React from "react";
import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/useAuth";
import { useActiveSession } from "@/hooks/useSessions";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();
  const isMobile = useIsMobile();
  const { profile } = useAuth();
  const { data: activeSession } = useActiveSession(profile?.id);

  const isPracticeActive = !!activeSession?.is_active;

  // Keep toasts above the bottom nav, and give extra clearance during active practice sessions.
  // Use safe-area inset so iOS devices with a home indicator don’t clip the toast.
  const mobileBottomOffset = isPracticeActive
    ? "calc(112px + env(safe-area-inset-bottom, 0px))"
    : "calc(92px + env(safe-area-inset-bottom, 0px))";

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group session-focus-exempt"
      position={isMobile ? "bottom-center" : "bottom-right"}
      offset={24}
      mobileOffset={{ bottom: mobileBottomOffset }}
      style={{
        // z-index above nav (z-50) so toasts are always visible
        zIndex: 60,
        // Smooth GPU-accelerated transitions for enter/exit
        ["--toast-enter-duration" as string]: "300ms",
        ["--toast-exit-duration" as string]: "200ms",
      }}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg session-focus-exempt",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };

