import { useEffect } from "react";
import { toast } from "sonner";

/**
 * Listens for the "sw-update-available" custom event dispatched by main.tsx
 * and shows a non-intrusive toast so the user can update when ready.
 */
export default function UpdateAvailableToast() {
  useEffect(() => {
    const handleUpdate = () => {
      toast("A new version is available", {
        duration: Infinity,
        id: "sw-update",
        action: {
          label: "Update now",
          onClick: () => {
            navigator.serviceWorker
              .getRegistration()
              .then((reg) => {
                reg?.waiting?.postMessage({ type: "SKIP_WAITING" });
              })
              .finally(() => {
                window.location.reload();
              });
          },
        },
      });
    };

    window.addEventListener("sw-update-available", handleUpdate);
    return () => window.removeEventListener("sw-update-available", handleUpdate);
  }, []);

  return null;
}
