import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// Robust service worker registration with auto-update.
// This prevents old cached builds from breaking critical flows like OAuth redirects.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((registration) => {
        // Proactively check for updates (immediately + periodically).
        registration.update().catch(() => void 0);
        window.setInterval(() => {
          registration.update().catch(() => void 0);
        }, 60 * 60 * 1000); // hourly
      })
      .catch((error) => {
        console.warn("SW registration failed:", error);
      });

    // Reload immediately when a new SW takes control.
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  });
}


