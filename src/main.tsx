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

        // If there is already a waiting worker (e.g., opened in another tab), apply it.
        if (registration.waiting) {
          registration.waiting.postMessage({ type: "SKIP_WAITING" });
        }

        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          if (!installing) return;

          installing.addEventListener("statechange", () => {
            // When the new SW is installed, trigger it to activate immediately.
            if (installing.state === "installed" && registration.waiting) {
              registration.waiting.postMessage({ type: "SKIP_WAITING" });
            }
          });
        });
      })
      .catch((error) => {
        console.warn("SW registration failed:", error);
      });

    // Reload the page once the new SW takes control.
    // Defer reload if user is actively viewing the page to avoid jarring mid-use reloads.
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      if (document.visibilityState === "visible") {
        // Page is active — wait until user leaves and returns
        const onVisChange = () => {
          if (document.visibilityState === "visible") {
            refreshing = true;
            document.removeEventListener("visibilitychange", onVisChange);
            window.location.reload();
          }
        };
        document.addEventListener("visibilitychange", onVisChange);
      } else {
        refreshing = true;
        window.location.reload();
      }
    });
  });
}


