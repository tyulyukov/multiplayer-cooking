import { createFileRoute } from "@tanstack/react-router";

import { HomePage } from "@/pages/home/home-page";

type HomeSearch = { silpo?: "callback" | "connected" | "error"; code?: string; state?: string };

export const Route = createFileRoute("/")({
  component: HomePage,
  validateSearch: (search: Record<string, unknown>): HomeSearch => ({
    silpo:
      search.silpo === "callback" || search.silpo === "connected" || search.silpo === "error"
        ? search.silpo
        : undefined,
    code: typeof search.code === "string" ? search.code : undefined,
    state: typeof search.state === "string" ? search.state : undefined,
  }),
});
