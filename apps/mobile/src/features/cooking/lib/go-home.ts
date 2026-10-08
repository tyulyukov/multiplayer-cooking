import { router } from "expo-router";

// A cold start from an invite link has nothing under the room, so fall back to Home.
export const goHome = () => {
  if (router.canGoBack()) router.back();
  else router.replace("/");
};
