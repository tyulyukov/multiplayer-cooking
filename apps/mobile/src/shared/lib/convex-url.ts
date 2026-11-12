import Constants from "expo-constants";

const devConvexUrl = () => {
  const host = Constants.expoConfig?.hostUri?.split(":")[0] || "127.0.0.1";

  return `http://${host}:3210`;
};

const url = process.env.EXPO_PUBLIC_CONVEX_URL ?? (__DEV__ ? devConvexUrl() : undefined);

if (!url) {
  throw new Error("EXPO_PUBLIC_CONVEX_URL is not set");
}

export const convexUrl = url;
