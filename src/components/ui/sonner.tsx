import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();
  const isMobile = useIsMobile();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group session-focus-exempt"
      position={isMobile ? "bottom-center" : "bottom-right"}
      style={{ 
        // Position at the bottom, below the nav bar area
        // Use a low bottom value so toasts appear "behind" the nav
        bottom: isMobile ? 'calc(16px + env(safe-area-inset-bottom, 0px))' : '24px',
        // z-index below nav (z-50) so nav covers the toast, but above other content
        zIndex: 40,
        // Smooth GPU-accelerated transitions for enter/exit
        ['--toast-enter-duration' as string]: '300ms',
        ['--toast-exit-duration' as string]: '200ms',
      }}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg session-focus-exempt data-[state=closed]:animate-none data-[state=closed]:opacity-0 data-[state=closed]:transition-opacity data-[state=closed]:duration-300 data-[state=closed]:ease-out",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
