import { useToast } from "@/hooks/use-toast";
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/useAuth";
import { useActiveSession } from "@/hooks/useSessions";

export function Toaster() {
  const { toasts } = useToast();
  const isMobile = useIsMobile();
  const { profile } = useAuth();
  const { data: activeSession } = useActiveSession(profile?.id);

  const isPracticeActive = !!activeSession?.is_active;

  // Keep toasts above the bottom nav, with extra clearance during active practice sessions.
  // Matches the Sonner toast offset logic for consistency.
  const mobileBottomOffset = isPracticeActive
    ? "calc(112px + env(safe-area-inset-bottom, 0px))"
    : "calc(92px + env(safe-area-inset-bottom, 0px))";

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && <ToastDescription>{description}</ToastDescription>}
            </div>
            {action}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport
        className={isMobile ? "top-auto" : ""}
        style={isMobile ? { bottom: mobileBottomOffset } : undefined}
      />
    </ToastProvider>
  );
}
