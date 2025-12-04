import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { HelixThemeProvider } from "@helix/theming";
import "@helix/styles/dist/helix.css";
import { AIProvider } from "@context";
import { AGGridProvider } from "@helix/ag-grid";
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HelixThemeProvider>
      <AGGridProvider license="">
        <AIProvider>
          <App />
        </AIProvider>
      </AGGridProvider>
    </HelixThemeProvider>
  </StrictMode>
);
