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

// Service worker registration with deferred updates.
// New versions are detected but NOT force-reloaded; a toast lets the user choose when to update.
// SKIP on native iOS/Android — WKWebView has inconsistent SW support that can cause
// stale data, blank screens, and update failures.
if ("serviceWorker" in navigator && !isNativePlatform) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((registration) => {
        // Proactively check for updates (immediately + periodically).
        registration.update().catch(() => void 0);
        window.setInterval(() => {
          registration.update().catch(() => void 0);
        }, 60 * 60 * 1000); // hourly

        // When a new SW is found and installed, notify the app instead of force-reloading.
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;
          newWorker.addEventListener("statechange", () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              window.dispatchEvent(new CustomEvent("sw-update-available"));
            }
          });
        });
      })
      .catch((error) => {
        console.warn("SW registration failed:", error);
      });
  });
}


