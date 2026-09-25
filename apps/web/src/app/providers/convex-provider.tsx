import type { FC } from "react";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import type { ReactNode } from "react";

import { convexUrl, useConvexProxy } from "@/shared/lib/convex-url";

const convexClient = convexUrl
  ? new ConvexReactClient(useConvexProxy ? window.location.origin : convexUrl, {
      skipConvexDeploymentUrlCheck: useConvexProxy,
    })
  : null;

export const isConvexConfigured = convexClient !== null;

type ConvexBoundaryProps = { children: ReactNode };

export const ConvexBoundary: FC<ConvexBoundaryProps> = ({ children }) => {
  if (!convexClient) {
    return children;
  }

  return <ConvexProvider client={convexClient}>{children}</ConvexProvider>;
};
