import { RouterProvider } from "@tanstack/react-router";
import { SessionProvider } from "convex-helpers/react/sessions";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { ConvexBoundary } from "@/lib/convex";
import { useLocalStorage } from "@/lib/session";
import { router } from "@/router";

import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConvexBoundary>
      <SessionProvider useStorage={useLocalStorage}>
        <RouterProvider router={router} />
      </SessionProvider>
    </ConvexBoundary>
  </StrictMode>,
);
