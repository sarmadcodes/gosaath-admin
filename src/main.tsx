import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Theme } from "@radix-ui/themes";
import "@radix-ui/themes/styles.css";
import "./app.css";
import { App } from "./App";

/**
 * Radix Themes, set once at the root.
 *
 * Teal matches the GoSaath app's accent, and the panel follows the operator's
 * own system preference: this is a tool somebody sits in front of for an hour
 * at a time, not a page they glance at.
 */
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Theme accentColor="teal" grayColor="slate" radius="medium" appearance="inherit">
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Theme>
  </React.StrictMode>,
);
