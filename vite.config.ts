import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const convexProxyEnabled = process.env.VITE_CONVEX_PROXY === "true";
const tunnelHost = process.env.VITE_TUNNEL_HOST;

export default defineConfig({
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
  server: convexProxyEnabled
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
    : undefined,
});
