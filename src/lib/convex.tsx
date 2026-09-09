import { ConvexProvider, ConvexReactClient } from "convex/react";
import type { ReactNode } from "react";

import { convexUrl, useConvexProxy } from "./convex-url";

const convexClient = convexUrl
  ? new ConvexReactClient(useConvexProxy ? window.location.origin : convexUrl, {
      skipConvexDeploymentUrlCheck: useConvexProxy,
    })
  : null;

export const isConvexConfigured = convexClient !== null;

export function ConvexBoundary({ children }: { children: ReactNode }) {
  if (!convexClient) {
    return children;
  }

  return <ConvexProvider client={convexClient}>{children}</ConvexProvider>;
}
