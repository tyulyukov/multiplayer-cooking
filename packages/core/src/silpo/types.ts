import type { FunctionReturnType } from "convex/server";

import type { api } from "@multiplayer-cooking/backend/convex/_generated/api";

export type SilpoConnection = NonNullable<FunctionReturnType<typeof api.silpo.connection>>;
