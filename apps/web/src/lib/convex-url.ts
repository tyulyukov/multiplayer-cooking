export const convexUrl = import.meta.env.VITE_CONVEX_URL?.trim();
export const useConvexProxy = import.meta.env.DEV && import.meta.env.VITE_CONVEX_PROXY === "true";

export function proxyConvexStorageUrl(url: string) {
  if (!useConvexProxy || !convexUrl) return url;

  try {
    const storageUrl = new URL(url);
    if (
      storageUrl.origin !== new URL(convexUrl).origin ||
      !storageUrl.pathname.startsWith("/api/storage/")
    ) {
      return url;
    }

    return new URL(`${storageUrl.pathname}${storageUrl.search}`, window.location.origin).toString();
  } catch {
    return url;
  }
}
