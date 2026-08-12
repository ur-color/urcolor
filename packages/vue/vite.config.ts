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
      // Only the runtime dependencies stay external. reka-ui and @vueuse/core
      // are build-time only: they are inlined here so rollup can tree-shake
      // them down to the handful of primitives `src/primitives/index.ts`
      // touches, and consumers install neither. Adding either back to this list
      // makes it a hard dependency again.
      external: ["vue", "@urcolor/core", "@urcolor/shared"],
    },
  },
});
