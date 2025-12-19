import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import "./index.css";
import { Toaster } from "sonner";


ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
          <Toaster richColors position="top-right" />

    <RouterProvider router={router} />
  </React.StrictMode>
);
