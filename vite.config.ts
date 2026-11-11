import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      injectRegister: false,
      registerType: "prompt",
      workbox: {
        skipWaiting: false,
        clientsClaim: true,
        runtimeCaching: [
          {
            // Documents ouverts (lecture, miniatures) : gardés sur le téléphone pour économiser
            // les données et les relire sans réseau. Le jeton ?token= change à chaque session,
            // d'où ignoreSearch. Le cache est vidé à la déconnexion (lib/offline.ts).
            urlPattern: ({ url }) => /\/api\/v1\/drive\/files\/[^/]+\/(preview|thumbnail)$/.test(url.pathname),
            handler: "CacheFirst",
            options: {
              cacheName: "lekki-documents",
              matchOptions: { ignoreSearch: true },
              cacheableResponse: { statuses: [200] },
              expiration: { maxEntries: 150, maxAgeSeconds: 60 * 60 * 24 * 90, purgeOnQuotaError: true },
            },
          },
          {
            // Listes (documents, wiki, espaces, compte) : réseau d'abord, dernière copie si hors ligne.
            urlPattern: ({ url, request }) =>
              request.method === "GET" &&
              /\/api\/v1\/(auth\/me|workspaces|drive\/files|drive\/folders|wiki\/pages)(\/|$)/.test(url.pathname) &&
              !/\/(download|preview|thumbnail)$/.test(url.pathname),
            handler: "NetworkFirst",
            options: {
              cacheName: "lekki-api",
              networkTimeoutSeconds: 8,
              cacheableResponse: { statuses: [200] },
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30, purgeOnQuotaError: true },
            },
          },
        ],
      },
      includeAssets: ["logo.svg"],
      manifest: {
        name: "Lekki — La mémoire collective de ta promo",
        short_name: "Lekki",
        description: "Cours, TD et anciens sujets de ta promo, rangés par matière, avec une IA qui cite ses sources.",
        lang: "fr",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: "#0D0F12",
        theme_color: "#0D0F12",
        icons: [
          {
            src: "/logo.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
          {
            src: "/logo.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
    },
  },
  root: path.resolve(__dirname, "client"),
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port: 3000,
    host: "0.0.0.0",
    hmr: false,
    proxy: {
      "/api": "http://localhost:8000",
    },
  },
});
