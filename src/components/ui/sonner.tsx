import * as React from "react";
import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();
  const isMobile = useIsMobile();

  // Bottom offset uses the measured BottomNav height CSS variable (set by BottomNav component)
  // This ensures toasts always clear the nav regardless of viewport size or safe-area insets
  const bottomOffset = "calc(var(--bottom-nav-height, 0px) + 16px)";

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group session-focus-exempt"
      position={isMobile ? "bottom-center" : "bottom-right"}
      offset={24}
      mobileOffset={{ bottom: bottomOffset }}
      style={{
        // z-index well above nav (z-50) so toasts are always visible
        zIndex: 9999,
        // Apply bottom offset for non-mobile viewports as well (BottomNav is always present)
        bottom: !isMobile ? bottomOffset : undefined,
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
