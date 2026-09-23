import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";
import { defineConfig, loadEnv } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const workspaceRoot = fileURLToPath(new URL("../..", import.meta.url));

const readBackendConvexUrl = () => {
  try {
    return parseEnv(readFileSync(new URL("../backend/.env.local", import.meta.url), "utf8"))
      .CONVEX_URL;
  } catch {
    return undefined;
  }
};

export default defineConfig(({ command, mode }) => {
  const workspaceEnv = loadEnv(mode, workspaceRoot, "");
  const convexUrl = [
    process.env.VITE_CONVEX_URL,
    command === "serve" ? readBackendConvexUrl() : undefined,
    workspaceEnv.VITE_CONVEX_URL,
  ].find((value) => value?.trim());
  const convexProxyEnabled =
    (process.env.VITE_CONVEX_PROXY ?? workspaceEnv.VITE_CONVEX_PROXY) === "true";
  const tunnelHost = process.env.VITE_TUNNEL_HOST ?? workspaceEnv.VITE_TUNNEL_HOST;

  return {
    envDir: workspaceRoot,
    define: convexUrl
      ? { "import.meta.env.VITE_CONVEX_URL": JSON.stringify(convexUrl) }
      : undefined,
    plugins: [
      tanstackRouter({
        target: "react",
        autoCodeSplitting: true,
      }),
      react(),
      tailwindcss(),
      VitePWA({
        registerType: "autoUpdate",
        workbox: {
          globPatterns: ["**/*.{js,css,html,woff2}"],
        },
        manifest: {
          name: "Multiplayer Cooking",
          short_name: "Cooking",
          description: "Готуйте одну вечерю разом — крок за кроком.",
          lang: "uk",
          dir: "ltr",
          start_url: "/",
          scope: "/",
          display: "standalone",
          background_color: "#f3eee4",
          theme_color: "#f3eee4",
          icons: [
            {
              src: "pwa-192x192.png",
              sizes: "192x192",
              type: "image/png",
            },
            {
              src: "pwa-512x512.png",
              sizes: "512x512",
              type: "image/png",
            },
            {
              src: "pwa-512x512-maskable.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable",
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    server: {
      port: 5173,
      strictPort: true,
      ...(convexProxyEnabled
        ? {
            host: "127.0.0.1",
            allowedHosts: tunnelHost ? [tunnelHost] : [],
            proxy: {
              "^/api/(?:[0-9]+\\.[0-9]+\\.[0-9]+/sync|debug_event|storage(?:/.*)?)$": {
                target: "http://127.0.0.1:3210",
                changeOrigin: true,
                ws: true,
              },
            },
          }
        : {}),
    },
  };
});
