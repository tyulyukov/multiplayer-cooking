import { useMutation } from "convex/react";

import { api } from "@multiplayer-cooking/backend/convex/_generated/api";

export const useCookingSteps = () => {
  const toggleChecklist = useMutation(api.cookingSteps.toggleChecklist).withOptimisticUpdate(
    (store, args) => {
      const queryArgs = { roomId: args.roomId, participantToken: args.participantToken };
      const current = store.getQuery(api.cookingRooms.read, queryArgs);

      if (!current) return;
      store.setQuery(api.cookingRooms.read, queryArgs, {
        ...current,
        steps: current.steps.map((step) =>
          step.stepKey === args.stepKey
            ? {
                ...step,
                checkedIds: args.checked
                  ? [...new Set([...step.checkedIds, args.itemId])]
                  : step.checkedIds.filter((id) => id !== args.itemId),
              }
            : step,
        ),
      });
    },
  );

  return {
    start: useMutation(api.cookingSteps.start),
    wait: useMutation(api.cookingSteps.wait),
    ready: useMutation(api.cookingSteps.markReady),
    complete: useMutation(api.cookingSteps.complete),
    undo: useMutation(api.cookingSteps.undo),
    toggleChecklist,
    toggleIngredient: useMutation(api.cookingSteps.toggleIngredient),
    takeover: useMutation(api.cookingSteps.takeover),
    swapRoles: useMutation(api.cookingSteps.swapRoles),
  };
};
