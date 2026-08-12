import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider, ToastProvider } from "bluestar";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {/* colorScheme="auto" is the default; spelled out so it's obvious the app
        follows the OS light/dark preference, and that "light" or "dark" would
        pin it. useColorScheme() lets you build a toggle. */}
    <ThemeProvider colorScheme="auto">
      {/* Enables useToast() anywhere in the app. */}
      <ToastProvider>
        <App />
      </ToastProvider>
    </ThemeProvider>
  </StrictMode>
);
