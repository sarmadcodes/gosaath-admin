import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

// Self-hosted, and only the weights the design system actually uses. The app
// pairs Manrope for headings with Inter for everything else; the console does
// the same, because they are one product.
import "@fontsource/manrope/600.css";
import "@fontsource/manrope/700.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";

import "./design/tokens.css";
import "./design/base.css";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
