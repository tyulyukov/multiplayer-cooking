import { useMutation } from "convex/react";

import { api } from "@multiplayer-cooking/backend/convex/_generated/api";

export const useCookingTimers = () => {
  return {
    start: useMutation(api.cookingTimers.start),
    pause: useMutation(api.cookingTimers.pause),
    resume: useMutation(api.cookingTimers.resume),
    cancel: useMutation(api.cookingTimers.cancel),
    acknowledge: useMutation(api.cookingTimers.acknowledge),
    restore: useMutation(api.cookingTimers.restore),
    restart: useMutation(api.cookingTimers.restart),
    addTime: useMutation(api.cookingTimers.addTime),
    create: useMutation(api.cookingTimers.createManual),
  };
};
