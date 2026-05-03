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

// ----- Service worker: robust production update strategy -----
// Prefer latest code over stale multi-day caches. Native iOS/Android builds skip SW.
if ("serviceWorker" in navigator && !isNativePlatform) {
  const ACTIVE_SESSION_KEY = 'noteshare_active_session';
  const UPDATE_RELOAD_KEY = 'noteshare_sw_reload_at';
  const UPDATE_TIMEOUT_MS = 2_500;
  const RELOAD_LOOP_WINDOW_MS = 15_000;

  const hasActiveSession = (): boolean => {
    try {
      const raw = localStorage.getItem(ACTIVE_SESSION_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      return !!(parsed?.session?.is_active);
    } catch {
      return false;
    }
  };

  const safelyReloadForUpdate = () => {
    try {
      const lastReload = Number(sessionStorage.getItem(UPDATE_RELOAD_KEY) || 0);
      const now = Date.now();
      if (now - lastReload < RELOAD_LOOP_WINDOW_MS) return;
      sessionStorage.setItem(UPDATE_RELOAD_KEY, String(now));
    } catch {
      // sessionStorage can fail in strict privacy modes; still prefer updating.
    }
    window.location.reload();
  };

  // Reload when the new SW takes control. Session storage guard prevents loops.
  let reloadingForUpdate = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloadingForUpdate) return;
    reloadingForUpdate = true;
    safelyReloadForUpdate();
  });

  const promoteWaiting = (worker: ServiceWorker | null | undefined, force = false) => {
    if (!worker) return;
    if (!force && hasActiveSession()) {
      // Mid-session: defer. Toast will let the user choose.
      window.dispatchEvent(new CustomEvent("sw-update-available"));
    } else {
      // Activate immediately; controllerchange reloads. Fallback handles browsers
      // that don't emit controllerchange reliably for waiting workers.
      worker.postMessage({ type: "SKIP_WAITING" });
      window.setTimeout(() => {
        if (!reloadingForUpdate) {
          reloadingForUpdate = true;
          safelyReloadForUpdate();
        }
      }, UPDATE_TIMEOUT_MS);
    }
  };

  const checkForFreshShell = async () => {
    try {
      const response = await fetch(`${window.location.origin}/?__ns_update=${Date.now()}`, {
        cache: "no-store",
        credentials: "same-origin",
        headers: { "Cache-Control": "no-cache" },
      });
      await response.text();
    } catch {
      // Best-effort request: forces HTTP cache revalidation without affecting UX.
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

        // Proactively check for updates and revalidate the HTML shell on load.
        checkForFreshShell();
        registration.update().then(() => promoteWaiting(registration.waiting)).catch(() => void 0);

        // Hourly background check (in case the tab is left open for a long time).
        window.setInterval(() => {
          registration.update().then(() => promoteWaiting(registration.waiting)).catch(() => void 0);
        }, 60 * 60 * 1000);

        // Re-check when the app/tab returns to the foreground.
        // This is critical for installed PWAs that get backgrounded for hours.
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") {
            checkForFreshShell();
            registration.update().then(() => promoteWaiting(registration.waiting)).catch(() => void 0);
          }
        });

        window.addEventListener("online", () => {
          checkForFreshShell();
          registration.update().then(() => promoteWaiting(registration.waiting)).catch(() => void 0);
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
