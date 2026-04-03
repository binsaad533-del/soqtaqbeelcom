import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Prevent service worker from interfering in preview/iframe contexts
const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

const isPreviewHost =
  window.location.hostname.includes("id-preview--") ||
  window.location.hostname.includes("lovableproject.com");

if (isPreviewHost || isInIframe) {
  navigator.serviceWorker?.getRegistrations().then((registrations) => {
    registrations.forEach((r) => r.unregister());
  });
}

// Anti-copy protection layer (production only)
if (!isPreviewHost && !isInIframe) {
  // Disable right-click context menu
  document.addEventListener("contextmenu", (e) => e.preventDefault());

  // Block common dev-tools shortcuts
  document.addEventListener("keydown", (e) => {
    // F12
    if (e.key === "F12") { e.preventDefault(); return; }
    // Ctrl+Shift+I / Cmd+Option+I (Inspector)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "I") { e.preventDefault(); return; }
    // Ctrl+Shift+J / Cmd+Option+J (Console)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "J") { e.preventDefault(); return; }
    // Ctrl+U / Cmd+U (View Source)
    if ((e.ctrlKey || e.metaKey) && e.key === "u") { e.preventDefault(); return; }
    // Ctrl+Shift+C (Element picker)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "C") { e.preventDefault(); return; }
    // Ctrl+S (Save page)
    if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); return; }
  });

  // Disable text selection on the page (except inputs/textareas)
  document.addEventListener("selectstart", (e) => {
    const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
    if (tag === "input" || tag === "textarea" || (e.target as HTMLElement)?.isContentEditable) return;
    e.preventDefault();
  });
}

createRoot(document.getElementById("root")!).render(<App />);
