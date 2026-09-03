import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { ConvexBoundary } from "@/lib/convex";
import { router } from "@/router";

import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConvexBoundary>
      <RouterProvider router={router} />
    </ConvexBoundary>
  </StrictMode>,
);
