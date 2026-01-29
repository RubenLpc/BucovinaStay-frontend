import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import "./index.css";
import { Toaster } from "sonner";
import { checkHealth } from "./api/client";
import "./i18n"; // ✅ IMPORTANT


function Bootstrap() {
  useEffect(() => {
    checkHealth().catch(() => {
      // daca backend e in maintenance, apiFetch ar trebui sa declanseze emitMaintenance
      // nu mai facem nimic aici
    });
  }, []);
  return null;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Toaster richColors position="top-right" />
    <Bootstrap />
    <RouterProvider router={router} />
  </React.StrictMode>
);
