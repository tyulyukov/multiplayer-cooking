import { v } from "convex/values";

import { query } from "./_generated/server";

export const current = query({
  args: {},
  returns: v.object({
    service: v.literal("convex"),
    ready: v.boolean(),
  }),
  handler: async () => ({
    service: "convex" as const,
    ready: true,
  }),
});
