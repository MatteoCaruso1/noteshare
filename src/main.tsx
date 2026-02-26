import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// Service worker registration with deferred updates.
// New versions are detected but NOT force-reloaded; a toast lets the user choose when to update.
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


