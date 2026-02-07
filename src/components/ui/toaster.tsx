import { createPortal } from "react-dom";
import { useToast } from "@/hooks/use-toast";
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast";

export function Toaster() {
  const { toasts } = useToast();

  // Bottom offset uses the measured BottomNav height CSS variable (set by BottomNav component)
  // This ensures toasts always clear the nav regardless of viewport size or safe-area insets
  const bottomOffset = "calc(var(--bottom-nav-height, 0px) + 16px)";

  const toasterContent = (
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
        style={{
          bottom: bottomOffset,
          zIndex: 9999,
        }}
      />
    </ToastProvider>
  );

  // Portal to body to escape any stacking contexts from the app tree
  if (typeof document !== "undefined") {
    return createPortal(toasterContent, document.body);
  }

  return toasterContent;
}
