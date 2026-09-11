import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider, ToastProvider } from "bluestar";
import App from "./App";
import { startAuthRefresh } from "./pb";
import { natureTheme, natureDarkTheme } from "./theme";

// Keeps the shared *.ryanzrau.dev auth cookie's short-lived token alive while
// this tab is open — see CookieAuthStore.ts.
startAuthRefresh();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {/* cookieDomain shares the color scheme and custom accent across every
        *.ryanzrau.dev subdomain, the same way CookieAuthStore.ts shares one
        auth session — a choice made here applies everywhere, not just this app. */}
    <ThemeProvider
      colorScheme="auto"
      cookieDomain=".ryanzrau.dev"
      theme={natureTheme}
      darkTheme={natureDarkTheme}
    >
      <ToastProvider>
        <App />
      </ToastProvider>
    </ThemeProvider>
  </StrictMode>
);
