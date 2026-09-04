import { SessionIdArg } from "convex-helpers/server/sessions";
import { v } from "convex/values";

import { mutation } from "./_generated/server";
import { getOrCreateUser } from "./lib/users";

// The browser uploads resized photos straight to Convex storage with this URL.
export const uploadUrl = mutation({
  args: SessionIdArg,
  returns: v.string(),
  handler: async (ctx, { sessionId }) => {
    await getOrCreateUser(ctx, sessionId);

    return ctx.storage.generateUploadUrl();
  },
});
