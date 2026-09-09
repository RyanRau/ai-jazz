import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider, ToastProvider } from "bluestar";
import App from "./App";
import { startAuthRefresh } from "./pb";

// Keeps the shared *.ryanzrau.dev auth cookie's short-lived token alive while
// this tab is open — see CookieAuthStore.ts.
startAuthRefresh();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider colorScheme="auto">
      <ToastProvider>
        <App />
      </ToastProvider>
    </ThemeProvider>
  </StrictMode>
);
