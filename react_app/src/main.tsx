import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { HelixThemeProvider } from "@helix/theming";
import "@helix/styles/dist/helix.css";
import { AIProvider } from "@context";
import { AGGridProvider } from "@helix/ag-grid";
import Charts from "./pages/Charts.tsx";
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HelixThemeProvider>
      <AGGridProvider license=''>
        <AIProvider>
          <BrowserRouter>
            <Routes>
              <Route path='/' element={<App />} />
              <Route path='/charts' element={<Charts />} />
            </Routes>
          </BrowserRouter>
        </AIProvider>
      </AGGridProvider>
    </HelixThemeProvider>
  </StrictMode>
);
