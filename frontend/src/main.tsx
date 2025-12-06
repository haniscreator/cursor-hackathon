// src/main.tsx
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Convex
import { ConvexReactClient, ConvexProvider } from "convex/react";

// --- Load Convex URL ---
const convexUrl =
  (import.meta.env.VITE_CONVEX_URL as string) || "http://127.0.0.1:3210";

console.log("%c[Convex Init] VITE_CONVEX_URL =", "color: #4da3ff", convexUrl);

// --- Create Convex client ---
const convex = new ConvexReactClient(convexUrl, {
  // show console logs for debugging
  unsavedChangesWarning: false,
});

// --- Mount React ---
const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("Root element #root not found in index.html");
}

createRoot(rootEl).render(
  <React.StrictMode>
    <ConvexProvider client={convex}>
      <App />
    </ConvexProvider>
  </React.StrictMode>
);
