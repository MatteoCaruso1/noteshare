import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

/**
 * Lets the user manually force a check for app updates.
 * Useful when an installed PWA is showing stale content.
 * Hidden on native iOS/Android (Capacitor handles updates differently).
 */
export function CheckForUpdatesCard() {
  const [checking, setChecking] = useState(false);

  const isNativePlatform = !!(window as any).Capacitor?.isNativePlatform?.();
  if (isNativePlatform) return null;
  if (!("serviceWorker" in navigator)) return null;

  const handleCheck = async () => {
    setChecking(true);
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        toast("You're on the latest version");
        return;
      }
      await registration.update();

      // If something is already waiting, activate it now.
      const waiting = registration.waiting;
      if (waiting) {
        toast("Updating to the latest version…");
        waiting.postMessage({ type: "SKIP_WAITING" });
        // controllerchange listener in main.tsx will reload.
        // Fallback reload after 1.5s in case controllerchange doesn't fire.
        setTimeout(() => window.location.reload(), 1500);
        return;
      }

      // Give the browser a moment to discover an updated SW, then check again.
      await new Promise((resolve) => setTimeout(resolve, 1200));
      const stillWaiting = (await navigator.serviceWorker.getRegistration())?.waiting;
      if (stillWaiting) {
        toast("Updating to the latest version…");
        stillWaiting.postMessage({ type: "SKIP_WAITING" });
        setTimeout(() => window.location.reload(), 1500);
      } else {
        toast("You're on the latest version", {
          icon: <CheckCircle2 className="w-4 h-4 text-primary" />,
        });
      }
    } catch (err) {
      console.warn("Update check failed:", err);
      toast("Couldn't check for updates");
    } finally {
      setChecking(false);
    }
  };

  return (
    <Card className="p-4 bg-card border-border">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-medium text-sm">App version</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Force-refresh if changes aren't showing up.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCheck}
          disabled={checking}
          className="flex-shrink-0"
        >
          <RefreshCw className={`w-4 h-4 mr-1.5 ${checking ? "animate-spin" : ""}`} />
          {checking ? "Checking…" : "Check for updates"}
        </Button>
      </div>
    </Card>
  );
}
