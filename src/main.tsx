import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// Defer service worker registration to avoid render-blocking
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Additional delay to ensure page is fully interactive before SW registration
    setTimeout(() => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' })
        .catch((error) => {
          console.warn('SW registration failed:', error);
        });
    }, 1000);
  });
}
