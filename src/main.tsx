import { createRoot } from "react-dom/client";

// Self-hosted fonts — no CDN dependency, no FOUT
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/dm-sans/700.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/lora/400.css";
import "@fontsource/lora/500.css";
import "@fontsource/lora/600.css";
import "@fontsource/lora/700.css";
import "@fontsource/space-mono/400.css";
import "@fontsource/space-mono/700.css";

import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// Configure status bar on native iOS/Android — dark style (light text) to match dark theme
const isNativePlatform = !!(window as any).Capacitor?.isNativePlatform?.();
if (isNativePlatform) {
  import('@capacitor/status-bar').then(({ StatusBar, Style }) => {
    StatusBar.setStyle({ style: Style.Dark }).catch(() => void 0);
    StatusBar.setOverlaysWebView({ overlay: true }).catch(() => void 0);
    StatusBar.setBackgroundColor({ color: '#141b2d' }).catch(() => void 0); // Android only
  }).catch(() => void 0);
}

// ----- Service worker: aggressive but session-safe update strategy -----
// Strategy:
//   1. On cold launch with NO active practice session → auto-skipWaiting + reload once.
//   2. If a session IS active → defer via toast (UpdateAvailableToast) to protect the session.
//   3. Re-check for updates every time the app returns to the foreground.
//   4. Reload exactly once when a new SW takes control (controllerchange).
// SKIP on native iOS/Android — WKWebView has inconsistent SW support.
if ("serviceWorker" in navigator && !isNativePlatform) {
  const ACTIVE_SESSION_KEY = 'noteshare_active_session';

  const hasActiveSession = (): boolean => {
    try {
      const raw = localStorage.getItem(ACTIVE_SESSION_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      return !!(parsed && parsed.session);
    } catch {
      return false;
    }
  };

  // Reload once when the new SW takes control. Guard prevents reload loops.
  let reloadingForUpdate = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloadingForUpdate) return;
    reloadingForUpdate = true;
    window.location.reload();
  });

  const promoteWaiting = (worker: ServiceWorker | null | undefined) => {
    if (!worker) return;
    if (hasActiveSession()) {
      // Mid-session: defer. Toast will let the user choose.
      window.dispatchEvent(new CustomEvent("sw-update-available"));
    } else {
      // Safe to update silently. controllerchange will reload.
      worker.postMessage({ type: "SKIP_WAITING" });
    }
  };

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((registration) => {
        // If a worker is already waiting at registration time, promote immediately.
        if (registration.waiting) {
          promoteWaiting(registration.waiting);
        }

        // Proactively check for updates on load.
        registration.update().catch(() => void 0);

        // Hourly background check (in case the tab is left open for a long time).
        window.setInterval(() => {
          registration.update().catch(() => void 0);
        }, 60 * 60 * 1000);

        // Re-check when the app/tab returns to the foreground.
        // This is critical for installed PWAs that get backgrounded for hours.
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") {
            registration.update().catch(() => void 0);
          }
        });

        // When a new SW is found and installs, promote it (or defer if mid-session).
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              promoteWaiting(newWorker);
            }
          });
        });
      })
      .catch((error) => {
        console.warn("SW registration failed:", error);
      });
  });
}
