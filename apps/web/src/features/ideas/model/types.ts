import type { FunctionReturnType } from "convex/server";

import type { api } from "@multiplayer-cooking/backend/convex/_generated/api";

export type Idea = NonNullable<FunctionReturnType<typeof api.ideas.latest>>;

export type IdeaVersions = Readonly<{
  index: number;
  count: number;
  onSelect: (index: number) => void;
  onRestore: () => void;
  restoring: boolean;
  restoreError: string | null;
}>;
