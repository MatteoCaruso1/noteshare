import * as React from "react";
import { createPortal } from "react-dom";
import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";

type ToasterProps = React.ComponentProps<typeof Sonner>;

// Create a stable container element that lives at document.body level
// so Sonner toasts escape all app stacking contexts (e.g. Radix Dialog portals)
function getOrCreatePortalContainer() {
  const id = "sonner-portal-root";
  let container = document.getElementById(id);
  if (!container) {
    container = document.createElement("div");
    container.id = id;
    container.style.position = "fixed";
    container.style.top = "0";
    container.style.left = "0";
    container.style.width = "0";
    container.style.height = "0";
    container.style.zIndex = "2147483647";
    container.style.pointerEvents = "none";
    document.body.appendChild(container);
  }
  return container;
}

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();
  const isMobile = useIsMobile();
  const [portalContainer, setPortalContainer] = React.useState<HTMLElement | null>(null);

  React.useEffect(() => {
    setPortalContainer(getOrCreatePortalContainer());
  }, []);

  // Bottom offset uses the measured BottomNav height CSS variable (set by BottomNav component)
  // This ensures toasts always clear the nav regardless of viewport size or safe-area insets
  const bottomOffset = "calc(var(--bottom-nav-height, 0px) + 16px)";

  const toasterContent = (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group session-focus-exempt"
      position={isMobile ? "bottom-center" : "bottom-right"}
      offset={24}
      mobileOffset={{ bottom: bottomOffset }}
      style={{
        // Max z-index to guarantee visibility above all dialogs and modals
        zIndex: 2147483647,
        pointerEvents: "auto",
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

  // Portal to a dedicated container at document.body level to escape stacking contexts
  if (portalContainer) {
    return createPortal(toasterContent, portalContainer);
  }

  return toasterContent;
};

export { Toaster, toast };
