import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import dts from "vite-plugin-dts";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => {
  const isLib = mode === "lib";

  return {
    plugins: [
      react(),
      isLib &&
        dts({
          insertTypesEntry: true,
          include: ["src/**/.ts", "src/**/.tsx"],
          exclude: ["src/**/.stories.tsx", "src/**/.test.tsx"],
        }),
      // PWA only in non-lib builds
      !isLib &&
        VitePWA({
          registerType: "autoUpdate",
          includeAssets: ["images/**", "icons/**", "*.png", "*.svg"],
          manifest: false, // We use our own public/manifest.json
          workbox: {
            // Cache static assets with Cache First
            globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
            // Network First for API calls (falls back to cache if offline)
            runtimeCaching: [
              {
                urlPattern: /^https?:\/\/.*\/api\/v1\/pos\/products($|\?.*)/,
                handler: "NetworkFirst",
                options: {
                  cacheName: "pos-products-cache",
                  expiration: {
                    maxAgeSeconds: 60 * 30, // 30 minutes
                    maxEntries: 1,
                  },
                  networkTimeoutSeconds: 10,
                  cacheableResponse: { statuses: [0, 200] },
                },
              },
              {
                urlPattern: /^https?:\/\/.*\/api\/v1\/tenant\/features/,
                handler: "NetworkFirst",
                options: {
                  cacheName: "pos-features-cache",
                  expiration: {
                    maxAgeSeconds: 60 * 60, // 1 hour
                    maxEntries: 1,
                  },
                  networkTimeoutSeconds: 10,
                  cacheableResponse: { statuses: [0, 200] },
                },
              },
            ],
          },
          devOptions: {
            // Enable in dev for testing (optional — service worker won't cache in dev)
            enabled: false,
          },
        }),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": resolve(__dirname, "./src"),
      },
    },
    build: isLib
      ? {
          lib: {
            entry: resolve(__dirname, "src/index.ts"),
            name: "A89DesignSystem",
            formats: ["es"],
            fileName: "index",
          },
          rollupOptions: {
            external: ["react", "react-dom", "react/jsx-runtime"],
            output: {
              globals: {
                react: "React",
                "react-dom": "ReactDOM",
                "react/jsx-runtime": "react/jsx-runtime",
              },
              assetFileNames: (assetInfo) => {
                if (assetInfo.name === "style.css") return "styles.css";
                return assetInfo.name;
              },
            },
          },
        }
      : {},
  };
});

