import { RouterProvider } from "@tanstack/react-router";
import { SessionProvider } from "convex-helpers/react/sessions";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { ConvexBoundary } from "@/app/providers/convex-provider";
import { router } from "@/app/router";
import { useLocalStorage } from "@/shared/hooks/use-local-storage";

import "@/app/styles/globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConvexBoundary>
      <SessionProvider useStorage={useLocalStorage}>
        <RouterProvider router={router} />
      </SessionProvider>
    </ConvexBoundary>
  </StrictMode>,
);
