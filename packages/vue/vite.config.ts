import { resolve } from "node:path";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [vue()],
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, "src/index.ts"),
        "namespaced/index": resolve(__dirname, "src/namespaced/index.ts"),
      },
      formats: ["es"],
    },
    rollupOptions: {
      external: ["vue", "@urcolor/core", "reka-ui", "internationalized-color"],
    },
  },
});
