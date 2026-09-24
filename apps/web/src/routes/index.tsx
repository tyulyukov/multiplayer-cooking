import { createFileRoute } from "@tanstack/react-router";

import { HomePage } from "@/pages/home/home-page";
import { isString } from "@/shared/lib/type-guards";

type HomeSearch = { silpo?: "callback" | "connected" | "error"; code?: string; state?: string };

export const Route = createFileRoute("/")({
  component: HomePage,
  validateSearch: (search): HomeSearch => ({
    silpo:
      search.silpo === "callback" || search.silpo === "connected" || search.silpo === "error"
        ? search.silpo
        : undefined,
    code: isString(search.code) ? search.code : undefined,
    state: isString(search.state) ? search.state : undefined,
  }),
});
