// src/main.jsx (REVISI TOTAL)

import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import "./index.css";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter basename="/race-directory">
      <App />
      <Toaster />
    </BrowserRouter>
  </StrictMode>
);
