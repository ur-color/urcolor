import { resolve } from "node:path";
import { defineConfig } from "vite";

const compat = resolve(__dirname, "../../node_modules/preact/compat");

export default defineConfig({
  resolve: {
    // Order matters: vite matches string aliases by prefix, so `react` would
    // otherwise swallow `react-dom` and `react/jsx-runtime`.
    alias: {
      "react/jsx-runtime": resolve(compat, "jsx-runtime"),
      "react-dom": compat,
      "react": compat,
    },
  },
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "preact",
  },
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      formats: ["es"],
      fileName: "index",
    },
    rollupOptions: {
      external: [
        "preact",
        "preact/compat",
        "preact/hooks",
        "preact/jsx-runtime",
        "@urcolor/core",
        "@urcolor/shared",
      ],
    },
  },
});
