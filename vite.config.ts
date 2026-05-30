import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import dts from "vite-plugin-dts";

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
