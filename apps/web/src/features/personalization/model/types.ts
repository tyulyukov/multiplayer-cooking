import type { FunctionReturnType } from "convex/server";

import type { api } from "@multiplayer-cooking/backend/convex/_generated/api";

export type Personalization = FunctionReturnType<typeof api.personalization.get>;
export type Memory = Personalization["memories"][number];
export type AgentSettings = Personalization["settings"];
